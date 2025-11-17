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

    console.log(`📊 [FRONTEND] Detectado cabeçalho na linha ${headerLineIndex + 1}, separador: "${separator === '\t' ? 'TAB' : 'vírgula'}"`);

    // Processar cabeçalho
    const headers = lines[headerLineIndex].split(separator).map((h: string) => {
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

    const transactions = [];

    // Processar linhas de dados (pular linhas antes do cabeçalho)
    console.log(`\n🔄 [FRONTEND] Processando ${lines.length - headerLineIndex - 1} linhas de dados...`);
    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        console.log(`⏭️  [FRONTEND Linha ${i + 1}] Linha vazia, pulando...`);
        continue;
      }

      const values = line.split(separator).map((v: string) => v.trim());
      const transaction: any = {};

      headers.forEach((header: string, index: number) => {
        const value = values[index] || '';

        // Data (português e inglês)
        if (header === 'date' || header === 'data') {
          transaction.data = value;
        }
        // Descrição
        else if (header === 'description' || header === 'descricao' || header === 'historico') {
          transaction.descricao = value;
        }
        // Crédito (Santander)
        else if (header.includes('credito') || header === 'credit') {
          transaction.credito = value;
        }
        // Débito (Santander)
        else if (header.includes('debito') || header === 'debit') {
          transaction.debito = value;
        }
        // Saldo (Santander)
        else if (header.includes('saldo') || header === 'balance') {
          transaction.saldo = value;
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
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Importar Transações</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Mode Selection */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setImportMode('csv')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                importMode === 'csv'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-5 h-5 inline mr-2" />
              Importar CSV
            </button>
            <button
              onClick={() => setImportMode('manual')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                importMode === 'manual'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Upload className="w-5 h-5 inline mr-2" />
              Adicionar Manual
            </button>
          </div>

          {/* CSV Import */}
          {importMode === 'csv' && (
            <div className="space-y-4">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-bold mb-3">📋 Como Importar Suas Transações</p>

                    <div className="mb-4">
                      <p className="font-semibold mb-2">🏦 Extratos Bancários (Santander, Itaú, etc.):</p>
                      <ul className="list-disc list-inside ml-2 space-y-1.5">
                        <li>Baixe o extrato do seu banco em formato <strong>Excel (.xls/.xlsx) ou CSV</strong></li>
                        <li>Se for Excel, converta para CSV ou copie e cole o conteúdo aqui</li>
                        <li>O sistema detecta automaticamente: cabeçalhos, separadores, formato de valores</li>
                        <li>Aceita colunas: <strong>Data, Descrição, Crédito, Débito, Saldo, Docto</strong></li>
                        <li>Formatos suportados: <strong>DD/MM/YYYY</strong> e valores em <strong>R$ 1.234,56</strong></li>
                      </ul>
                    </div>

                    <div className="mb-3">
                      <p className="font-semibold mb-2">📝 Formato Personalizado:</p>
                      <ul className="list-disc list-inside ml-2 space-y-1.5">
                        <li><strong>Campos obrigatórios:</strong> data (date ou data) e valor (amount, crédito ou débito)</li>
                        <li><strong>Campos opcionais:</strong> descrição, estabelecimento, categoria, moeda</li>
                        <li><strong>Valores:</strong> use negativo para despesas (-50.00) e positivo para receitas (1500.00)</li>
                        <li><strong>Data:</strong> aceita DD/MM/YYYY (brasileiro) ou YYYY-MM-DD (internacional)</li>
                      </ul>
                    </div>

                    <div className="bg-amber-50 border border-amber-300 rounded p-3 mb-2">
                      <p className="text-amber-800 text-xs font-semibold mb-1">⚡ IMPORTANTE:</p>
                      <p className="text-amber-800 text-xs">
                        • O sistema importa <strong>TODAS as linhas</strong> com data e valor válidos<br/>
                        • Se alguma transação não aparecer, verifique o console do navegador (F12) para ver os logs detalhados<br/>
                        • Linhas vazias ou sem data/valor serão automaticamente ignoradas
                      </p>
                    </div>

                    <button
                      onClick={downloadTemplate}
                      className="mt-2 text-blue-600 hover:text-blue-800 font-medium flex items-center"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Baixar modelo de exemplo
                    </button>
                  </div>
                </div>
              </div>

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
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                />
              </div>

              {/* Import Button */}
              <button
                onClick={handleImportCSV}
                disabled={importing || !csvContent.trim()}
                className="w-full btn-primary flex items-center justify-center"
              >
                {importing ? (
                  <>
                    <Upload className="w-5 h-5 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Importar CSV
                  </>
                )}
              </button>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Dica:</strong> Se não especificar a categoria, o sistema irá categorizá-la automaticamente baseado na descrição e estabelecimento.
                </p>
              </div>

              <button
                onClick={handleImportManual}
                disabled={importing || !manualTransaction.date || !manualTransaction.amount}
                className="w-full btn-primary flex items-center justify-center"
              >
                {importing ? (
                  <>
                    <Upload className="w-5 h-5 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Adicionar Transação
                  </>
                )}
              </button>
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
      </div>
    </div>
  );
};

export default ImportTransactionsModal;
