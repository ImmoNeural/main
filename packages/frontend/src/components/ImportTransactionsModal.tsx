import { useState } from 'react';
import { X, Upload, FileText, Info, Check, AlertCircle, Download } from 'lucide-react';
import { transactionApi } from '../services/api';

interface ImportTransactionsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ImportTransactionsModal = ({ onClose, onSuccess }: ImportTransactionsModalProps) => {
  const [importMode, setImportMode] = useState<'csv' | 'manual'>('csv');
  const [csvContent, setCsvContent] = useState('');
  const [manualTransaction, setManualTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    merchant: '',
    category: '',
  });
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; imported: number; errors?: string[]; message: string } | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file);
  };

  const parseCSV = (csv: string) => {
    console.log('\n🔄 [FRONTEND] Iniciando parse do CSV...');
    console.log('═══════════════════════════════════════════════════════════════');

    const lines = csv.trim().split('\n');
    console.log(`📄 [FRONTEND] Total de linhas no arquivo: ${lines.length}`);

    if (lines.length < 2) {
      throw new Error('CSV deve ter pelo menos 2 linhas (cabeçalho + dados)');
    }

    // Auto-detectar separador (vírgula ou tabulação)
    const firstLine = lines[0];
    const separator = firstLine.includes('\t') ? '\t' : ',';

    console.log(`🔍 [FRONTEND] Separador detectado: "${separator === '\t' ? 'TAB' : 'VÍRGULA'}"`);

    // Função para fazer split respeitando aspas (resolve problema de vírgula decimal)
    const smartSplit = (line: string, sep: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === sep && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }

      result.push(current.trim());
      return result;
    };

    // Auto-detectar linha do cabeçalho (procurar por palavras-chave)
    let headerLineIndex = 0;
    const headerKeywords = ['data', 'date', 'descrição', 'description', 'valor', 'amount', 'crédito', 'débito'];

    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].toLowerCase();
      const matchCount = headerKeywords.filter(keyword => line.includes(keyword)).length;
      if (matchCount >= 2) {
        headerLineIndex = i;
        break;
      }
    }

    console.log(`📊 [FRONTEND] Detectado cabeçalho na linha ${headerLineIndex + 1}`);

    // Processar cabeçalho usando smartSplit
    const headers = smartSplit(lines[headerLineIndex], separator).map((h: string) => {
      // Normalizar: remover acentos, espaços extras, parênteses
      return h.trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/\s+/g, '_') // Substitui espaços por _
        .replace(/[()]/g, '') // Remove parênteses
        .replace(/r\$/g, ''); // Remove R$
    });

    console.log('📋 [FRONTEND] Cabeçalhos normalizados:', headers);
    console.log(`📋 [FRONTEND] Total de colunas: ${headers.length}`);

    const transactions = [];

    // Processar linhas de dados (pular linhas antes do cabeçalho)
    console.log(`\n🔄 [FRONTEND] Processando ${lines.length - headerLineIndex - 1} linhas de dados...`);
    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        console.log(`⏭️  [FRONTEND Linha ${i + 1}] Linha vazia, pulando...`);
        continue;
      }

      // Usar smartSplit para respeitar aspas
      const values = smartSplit(line, separator).map((v: string) => v.trim().replace(/^"|"$/g, '')); // Remove aspas das pontas
      console.log(`\n📊 [FRONTEND Linha ${i + 1}] Valores (${values.length} colunas):`, values);
      const transaction: any = {};

      headers.forEach((header: string, index: number) => {
        let value = values[index] || '';

        // Data (português e inglês)
        if (header === 'date' || header === 'data') {
          transaction.data = value;
        }
        // Descrição
        else if (header === 'description' || header === 'descricao' || header === 'historico') {
          transaction.descricao = value;
        }
        // Crédito (Santander) - limpar espaços e caracteres extras
        else if (header.includes('credito') || header === 'credit') {
          // Limpar valor: remover aspas duplas extras, espaços, manter apenas números, vírgula e ponto
          value = value.replace(/["'\s]/g, '').trim();
          if (value && value !== '0' && value !== '0,00') {
            transaction.credito = value;
          }
        }
        // Débito (Santander) - limpar espaços e caracteres extras
        else if (header.includes('debito') || header === 'debit') {
          // Limpar valor: remover aspas duplas extras, espaços, manter apenas números, vírgula e ponto
          value = value.replace(/["'\s]/g, '').trim();
          if (value && value !== '0' && value !== '0,00') {
            transaction.debito = value;
          }
        }
        // Saldo (Santander) - limpar espaços e caracteres extras
        else if (header.includes('saldo') || header === 'balance') {
          const cleanedValue = value.replace(/["'\s]/g, '').trim();
          transaction.saldo = cleanedValue;
          console.log(`   💰 [FRONTEND] Header "${header}" (index ${index}): valor bruto="${value}" → limpo="${cleanedValue}"`);
        }
        // Docto/Documento (Santander)
        else if (header === 'docto' || header === 'documento' || header === 'doc') {
          transaction.docto = value;
        }
        // Situação (Santander)
        else if (header === 'situacao' || header === 'status') {
          transaction.situacao = value;
        }
        // Amount (formato padrão)
        else if (header === 'amount' || header === 'valor') {
          transaction.amount = value;
        }
        // Merchant/Estabelecimento
        else if (header === 'merchant' || header === 'estabelecimento') {
          transaction.merchant = value;
        }
        // Categoria
        else if (header === 'category' || header === 'categoria') {
          transaction.categoria = value;
        }
        // Moeda
        else if (header === 'currency' || header === 'moeda') {
          transaction.currency = value;
        }
      });

      console.log(`\n🔍 [FRONTEND Linha ${i + 1}] Transação parseada:`, JSON.stringify(transaction, null, 2));

      // Só adicionar se tiver pelo menos data OU descrição
      // Deixar o backend fazer validação mais rigorosa
      const hasData = transaction.data;
      const hasDescricao = transaction.descricao;

      if (hasData || hasDescricao) {
        transactions.push(transaction);
        console.log(`✅ [FRONTEND Linha ${i + 1}] Transação ADICIONADA à lista de envio`);
      } else {
        console.log(`⏭️  [FRONTEND Linha ${i + 1}] Transação IGNORADA (sem data e sem descrição)`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`📊 [FRONTEND] Resumo do parse:`);
    console.log(`   ✅ Transações parseadas: ${transactions.length}`);
    console.log(`   📤 Enviando para backend...`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (transactions.length === 0) {
      throw new Error('Nenhuma transação válida encontrada no CSV. Verifique o formato do arquivo.');
    }

    return transactions;
  };

  const handleImportCSV = async () => {
    if (!csvContent.trim()) {
      alert('Por favor, selecione um arquivo CSV ou cole o conteúdo');
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const transactions = parseCSV(csvContent);
      console.log(`📤 [FRONTEND] Enviando ${transactions.length} transações para o backend...`);
      const response = await transactionApi.importTransactions({ transactions });
      console.log('📥 [FRONTEND] Resposta do backend:', response.data);
      setResult(response.data);

      if (response.data.success) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error importing CSV:', error);
      setResult({
        success: false,
        imported: 0,
        errors: [error.message || 'Erro ao importar CSV'],
        message: 'Falha na importação',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleImportManual = async () => {
    if (!manualTransaction.date || !manualTransaction.amount) {
      alert('Data e valor são obrigatórios');
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const response = await transactionApi.importTransactions({
        transactions: [{
          date: manualTransaction.date,
          amount: parseFloat(manualTransaction.amount),
          description: manualTransaction.description,
          merchant: manualTransaction.merchant,
          category: manualTransaction.category || undefined,
        }],
      });
      setResult(response.data);

      if (response.data.success) {
        // Limpar formulário
        setManualTransaction({
          date: new Date().toISOString().split('T')[0],
          amount: '',
          description: '',
          merchant: '',
          category: '',
        });

        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error importing manual transaction:', error);
      setResult({
        success: false,
        imported: 0,
        errors: [error.response?.data?.error || 'Erro ao importar transação'],
        message: 'Falha na importação',
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = `date,amount,description,merchant,category
2024-01-15,-45.90,Supermercado XYZ,Supermercado XYZ,Alimentação
2024-01-16,-12.00,Uber,Uber,Transporte
2024-01-17,3500.00,Salário,Empresa ABC,Salário`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_transacoes.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Importar Transações</h2>
            <div className="group relative">
              <button className="text-gray-400 hover:text-blue-600 transition-colors">
                <Info className="w-5 h-5" />
              </button>
              {/* Tooltip com instruções */}
              <div className="absolute left-0 top-8 w-80 bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="text-xs text-blue-800">
                  <p className="font-bold mb-2">📋 Como Importar</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Aceita CSV, Excel ou extratos bancários</li>
                    <li>Detecção automática de formato</li>
                    <li>Data: DD/MM/YYYY, Valores: R$ 1.234,56</li>
                  </ul>
                  <button
                    onClick={downloadTemplate}
                    className="mt-2 text-blue-600 hover:text-blue-800 font-medium flex items-center"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Baixar modelo
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Mode Selection - Compact tabs */}
          <div className="flex space-x-2 mb-4 border-b border-gray-200">
            <button
              onClick={() => setImportMode('csv')}
              className={`px-4 py-2 font-medium transition-colors ${
                importMode === 'csv'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-1" />
              CSV
            </button>
            <button
              onClick={() => setImportMode('manual')}
              className={`px-4 py-2 font-medium transition-colors ${
                importMode === 'manual'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Upload className="w-4 h-4 inline mr-1" />
              Manual
            </button>
          </div>

          {/* CSV Import */}
          {importMode === 'csv' && (
            <div className="space-y-4">

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecionar arquivo CSV
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                />
              </div>

              {/* Or paste content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ou cole o conteúdo do CSV
                </label>
                <textarea
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder="date,amount,description,merchant
2024-01-15,-45.90,Supermercado XYZ,Supermercado"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                />
              </div>
            </div>
          )}

          {/* Manual Import */}
          {importMode === 'manual' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={manualTransaction.date}
                    onChange={(e) => setManualTransaction({ ...manualTransaction, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor * (negativo = despesa)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualTransaction.amount}
                    onChange={(e) => setManualTransaction({ ...manualTransaction, amount: e.target.value })}
                    placeholder="-45.90"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <input
                  type="text"
                  value={manualTransaction.description}
                  onChange={(e) => setManualTransaction({ ...manualTransaction, description: e.target.value })}
                  placeholder="Ex: Compra no supermercado"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estabelecimento
                </label>
                <input
                  type="text"
                  value={manualTransaction.merchant}
                  onChange={(e) => setManualTransaction({ ...manualTransaction, merchant: e.target.value })}
                  placeholder="Ex: Supermercado XYZ"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria (deixe vazio para categorização automática)
                </label>
                <input
                  type="text"
                  value={manualTransaction.category}
                  onChange={(e) => setManualTransaction({ ...manualTransaction, category: e.target.value })}
                  placeholder="Ex: Alimentação"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`mt-6 p-4 rounded-lg border ${
              result.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start space-x-3">
                {result.success ? (
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                    {result.message}
                  </p>
                  {result.success && (
                    <p className="text-sm text-green-700 mt-1">
                      {result.imported} transação(ões) importada(s) com sucesso!
                    </p>
                  )}
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-red-900">Erros:</p>
                      <ul className="list-disc list-inside text-sm text-red-700 mt-1">
                        {result.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {result.errors.length > 5 && (
                          <li>... e mais {result.errors.length - 5} erro(s)</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with action buttons */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end gap-3">
          {importMode === 'csv' ? (
            <button
              onClick={handleImportCSV}
              disabled={importing || !csvContent.trim()}
              className="btn-primary flex items-center"
            >
              {importing ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar CSV
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleImportManual}
              disabled={importing || !manualTransaction.date || !manualTransaction.amount}
              className="btn-primary flex items-center"
            >
              {importing ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Adicionar Manual
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportTransactionsModal;
