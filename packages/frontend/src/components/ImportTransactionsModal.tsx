import { useState } from 'react';
import { X, Upload, FileText, Info, Check, AlertCircle, Download, Sparkles } from 'lucide-react';
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

      // Detectar erros específicos
      const is413Error = error.message?.includes('413') || error.response?.status === 413;
      const errorMessage = error.response?.data?.error || error.message || 'Erro desconhecido';
      const isLimitError = errorMessage.includes('Máximo de') || errorMessage.includes('Maximum');

      let displayError: string;
      let displayMessage: string;

      if (is413Error) {
        displayError = 'Arquivo muito grande. Tente dividir em arquivos menores (ex: 3-4 meses por vez).';
        displayMessage = 'Arquivo muito grande';
      } else if (isLimitError) {
        displayError = errorMessage;
        displayMessage = 'Limite excedido';
      } else {
        displayError = errorMessage;
        displayMessage = 'Falha na importação';
      }

      setResult({
        success: false,
        imported: 0,
        errors: [displayError],
        message: displayMessage,
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
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900/80 via-gray-800/80 to-blue-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl transform transition-all animate-slide-up">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-t-2xl px-6 py-5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                Importar Transações
                <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
              </h2>
              <p className="text-blue-100 text-sm mt-0.5">Adicione suas transações de forma rápida e fácil</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 transition-all p-2 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white">
          {/* Mode Selection - Modern tabs */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1.5 rounded-xl">
            <button
              onClick={() => setImportMode('csv')}
              className={`flex-1 px-4 py-3 font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                importMode === 'csv'
                  ? 'bg-white text-blue-600 shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <FileText className="w-5 h-5" />
              Importar CSV
            </button>
            <button
              onClick={() => setImportMode('manual')}
              className={`flex-1 px-4 py-3 font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                importMode === 'manual'
                  ? 'bg-white text-blue-600 shadow-md transform scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Upload className="w-5 h-5" />
              Adicionar Manual
            </button>
          </div>

          {/* CSV Import */}
          {importMode === 'csv' && (
            <div className="space-y-5">
              {/* Info box */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900 mb-1">Como importar seu CSV</p>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Aceita extratos bancários em CSV ou Excel</li>
                      <li>• Detecção automática de formato e separador</li>
                      <li>• Data: DD/MM/YYYY | Valores: R$ 1.234,56</li>
                    </ul>
                    <button
                      onClick={downloadTemplate}
                      className="mt-3 text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 bg-white/50 hover:bg-white px-3 py-1.5 rounded-lg transition-all text-sm border border-blue-300"
                    >
                      <Download className="w-4 h-4" />
                      Baixar modelo de exemplo
                    </button>
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Selecionar arquivo CSV
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-900 border-2 border-gray-300 rounded-xl cursor-pointer bg-white hover:bg-gray-50 focus:outline-none focus:border-blue-500 transition-all p-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              {/* Or paste content */}
              <div className="relative">
                <div className="absolute top-0 left-0 right-0 flex items-center justify-center">
                  <div className="bg-white px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide border border-gray-300 rounded-full -mt-3">
                    ou
                  </div>
                </div>
                <div className="pt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cole o conteúdo do CSV aqui
                  </label>
                  <textarea
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                    placeholder="date,amount,description,merchant
2024-01-15,-45.90,Supermercado XYZ,Supermercado
2024-01-16,-12.00,Uber,Uber"
                    rows={7}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-sm bg-gray-50 hover:bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Manual Import */}
          {importMode === 'manual' && (
            <div className="space-y-5">
              {/* Info */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-purple-900 text-sm">
                      Preencha os campos abaixo. A categorização será feita automaticamente se você deixar a categoria vazia.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Data <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={manualTransaction.date}
                    onChange={(e) => setManualTransaction({ ...manualTransaction, date: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white hover:border-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Valor <span className="text-red-500">*</span>
                    <span className="text-xs font-normal text-gray-500 ml-1">(negativo = despesa)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualTransaction.amount}
                    onChange={(e) => setManualTransaction({ ...manualTransaction, amount: e.target.value })}
                    placeholder="-45.90"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white hover:border-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descrição
                </label>
                <input
                  type="text"
                  value={manualTransaction.description}
                  onChange={(e) => setManualTransaction({ ...manualTransaction, description: e.target.value })}
                  placeholder="Ex: Compra no supermercado"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white hover:border-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Estabelecimento
                </label>
                <input
                  type="text"
                  value={manualTransaction.merchant}
                  onChange={(e) => setManualTransaction({ ...manualTransaction, merchant: e.target.value })}
                  placeholder="Ex: Supermercado XYZ"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white hover:border-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Categoria
                  <span className="text-xs font-normal text-gray-500 ml-1">(opcional - deixe vazio para auto-categorizar)</span>
                </label>
                <input
                  type="text"
                  value={manualTransaction.category}
                  onChange={(e) => setManualTransaction({ ...manualTransaction, category: e.target.value })}
                  placeholder="Ex: Alimentação"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white hover:border-gray-400"
                />
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`mt-6 p-5 rounded-xl border-2 shadow-lg transform transition-all animate-slide-up ${
              result.success
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
                : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-300'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
                  {result.success ? (
                    <Check className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-bold text-lg ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                    {result.message}
                  </p>
                  {result.success && (
                    <p className="text-sm text-green-700 mt-1 font-medium">
                      🎉 {result.imported} transação(ões) importada(s) com sucesso!
                    </p>
                  )}
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-3 bg-white/50 rounded-lg p-3 border border-red-200">
                      <p className="text-sm font-semibold text-red-900 mb-2">Erros encontrados:</p>
                      <ul className="space-y-1 text-sm text-red-700">
                        {result.errors.slice(0, 5).map((error, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-red-500 font-bold">•</span>
                            <span>{error}</span>
                          </li>
                        ))}
                        {result.errors.length > 5 && (
                          <li className="text-red-600 font-medium">... e mais {result.errors.length - 5} erro(s)</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer com gradiente */}
        <div className="border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-white hover:border-gray-400 transition-all"
          >
            Cancelar
          </button>
          {importMode === 'csv' ? (
            <button
              onClick={handleImportCSV}
              disabled={importing || !csvContent.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
            >
              {importing ? (
                <>
                  <Upload className="w-5 h-5 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Importar CSV
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleImportManual}
              disabled={importing || !manualTransaction.date || !manualTransaction.amount}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
            >
              {importing ? (
                <>
                  <Upload className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Adicionar Transação
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
