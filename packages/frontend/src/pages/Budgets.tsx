import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { transactionApi } from '../services/api';
import type { Transaction } from '../types';
import { startOfMonth, subMonths, format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight, TrendingUp, ChevronLeft, ChevronRight, AlertTriangle, TrendingDown } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';

// --- BASE DE REGRAS COMPLETA EXTRAÍDA DE categorization_service.ts ---
interface CategoryRule {
  type: string;
  category: string;
  subcategory: string;
  icon: string;
  color: string;
  note: string;
}

const ALL_CATEGORY_RULES: CategoryRule[] = [
  // DESPESAS VARIÁVEIS (Consumo e Lazer)
  { type: 'Despesas Variáveis', category: 'Supermercado', subcategory: 'Compras de Mercado', icon: '🛒', color: '#4CAF50', note: 'Grandes redes e atacados (Carrefour, Assaí, Zaffari).' },
  { type: 'Despesas Variáveis', category: 'Alimentação', subcategory: 'Restaurantes e Delivery', icon: '🍕', color: '#FF5722', note: 'Restaurantes, lanchonetes e apps (iFood, Uber Eats, Outback).' },
  { type: 'Despesas Variáveis', category: 'Transporte', subcategory: 'Apps de Transporte', icon: '🚗', color: '#2196F3', note: 'Corridas de aplicativos (Uber, 99, Cabify).' },
  { type: 'Despesas Variáveis', category: 'Transporte', subcategory: 'Combustível e Pedágio', icon: '⛽', color: '#FF9800', note: 'Postos de gasolina (Shell, Ipiranga) e tags de pedágio (Sem Parar).' },
  { type: 'Despesas Variáveis', category: 'Transporte', subcategory: 'Transporte Público', icon: '🚌', color: '#3F51B5', note: 'Passagens de metrô, trem e ônibus.' },
  { type: 'Despesas Variáveis', category: 'Compras', subcategory: 'E-commerce', icon: '🛍️', color: '#E91E63', note: 'Marketplaces e grandes varejistas online (ML, Amazon, Magalu).' },
  { type: 'Despesas Variáveis', category: 'Compras', subcategory: 'Moda e Vestuário', icon: '👕', color: '#FF4081', note: 'Lojas de roupa e calçados (Renner, C&A, Dafiti).' },
  { type: 'Despesas Variáveis', category: 'Compras', subcategory: 'Tecnologia', icon: '📱', color: '#607D8B', note: 'Eletrônicos, computadores e gadgets.' },
  { type: 'Despesas Variáveis', category: 'Casa', subcategory: 'Construção e Reforma', icon: '🏠', color: '#795548', note: 'Materiais de construção e ferramentas (Leroy Merlin, Telhanorte).' },
  { type: 'Despesas Variáveis', category: 'Casa', subcategory: 'Móveis e Decoração', icon: '🛋️', color: '#8D6E63', note: 'Móveis, estofados e artigos de decoração (Tok & Stok, Etna).' },
  { type: 'Despesas Variáveis', category: 'Entretenimento', subcategory: 'Lazer e Diversão', icon: '🎮', color: '#9C27B0', note: 'Cinema, teatro, shows e parques (Playcenter, Hopi Hari).' },
  { type: 'Despesas Variáveis', category: 'Saúde', subcategory: 'Farmácias e Drogarias', icon: '💊', color: '#009688', note: 'Compra de remédios e itens em Drogasil, Raia, Panvel.' },
  { type: 'Despesas Variáveis', category: 'Saúde', subcategory: 'Academia e Fitness', icon: '🏋️', color: '#FF5722', note: 'Mensalidades de academias e estúdios (Smart Fit, Bodytech).' },
  { type: 'Despesas Variáveis', category: 'Pet', subcategory: 'Pet Shop e Veterinário', icon: '🐕', color: '#FF9800', note: 'Gastos com animais de estimação, ração e veterinário (Petz, Cobasi).' },
  { type: 'Despesas Variáveis', category: 'Viagens', subcategory: 'Aéreo e Turismo', icon: '✈️', color: '#2196F3', note: 'Passagens, hotéis e pacotes (Decolar, Booking, Gol, Azul).' },

  // DESPESAS FIXAS (Recorrentes e Obrigatórias)
  { type: 'Despesas Fixas', category: 'Contas', subcategory: 'Telefonia e Internet', icon: '📱', color: '#00BCD4', note: 'Planos de telefonia e internet fixa (Vivo, Claro, Oi).' },
  { type: 'Despesas Fixas', category: 'Contas', subcategory: 'Energia e Água', icon: '⚡', color: '#FFC107', note: 'Contas de utilidade básica (Sabesp, Enel, Cemig).' },
  { type: 'Despesas Fixas', category: 'Contas', subcategory: 'Boletos e Débitos', icon: '📄', color: '#607D8B', note: 'Identificação genérica de pagamento de boletos.' },
  { type: 'Despesas Fixas', category: 'Serviços Financeiros', subcategory: 'Bancos e Fintechs', icon: '💳', color: '#673AB7', note: 'Tarifas e serviços bancários (Itaú, Nubank, PicPay).' },
  { type: 'Despesas Fixas', category: 'Entretenimento', subcategory: 'Streaming e Assinaturas', icon: '📺', color: '#E91E63', note: 'Serviços digitais recorrentes (Netflix, Spotify, Disney+).' },
  { type: 'Despesas Fixas', category: 'Educação', subcategory: 'Cursos e Ensino', icon: '🎓', color: '#3F51B5', note: 'Matrículas, mensalidades e cursos livres.' },
  { type: 'Despesas Fixas', category: 'Educação', subcategory: 'Livrarias e Papelarias', icon: '📚', color: '#5C6BC0', note: 'Livros, artigos de papelaria e material didático.' },
  { type: 'Despesas Fixas', category: 'Impostos e Taxas', subcategory: 'IOF e Impostos', icon: '🏦', color: '#F44336', note: 'Cobrança de impostos e taxas específicas (IOF).' },
  { type: 'Despesas Fixas', category: 'Saúde', subcategory: 'Odontologia', icon: '🦷', color: '#00BCD4', note: 'Mensalidades ou pagamentos recorrentes a dentistas/clínicas.' },
  { type: 'Despesas Fixas', category: 'Saúde', subcategory: 'Médicos e Clínicas', icon: '⚕️', color: '#009688', note: 'Hospitais, exames e consultas médicas (inclui Plano de Saúde recorrente).' },

  // MOVIMENTAÇÕES (Receitas, Transferências, Investimentos e Saques)
  { type: 'Movimentações', category: 'Salário', subcategory: 'Salário e Rendimentos', icon: '💰', color: '#4CAF50', note: 'Recebimento de salário, pró-labore ou depósitos de folha.' },
  { type: 'Movimentações', category: 'Receitas', subcategory: 'Rendimentos de Investimentos', icon: '💹', color: '#4CAF50', note: 'Recebimento de juros, dividendos e resgates de títulos.' },
  { type: 'Movimentações', category: 'Investimentos', subcategory: 'Aplicações e Investimentos', icon: '📈', color: '#2196F3', note: 'Aplicações de débito em CDB, LCA, LCI, Tesouro Direto.' },
  { type: 'Movimentações', category: 'Investimentos', subcategory: 'Poupança e Capitalização', icon: '💰', color: '#4CAF50', note: 'Movimentações de poupança e títulos de capitalização.' },
  { type: 'Movimentações', category: 'Investimentos', subcategory: 'Corretoras e Fundos', icon: '📈', color: '#2196F3', note: 'Transações em corretoras (XP, Rico, Clear) e fundos.' },
  { type: 'Movimentações', category: 'Transferências', subcategory: 'PIX', icon: '💸', color: '#00C853', note: 'Transações instantâneas enviadas ou recebidas.' },
  { type: 'Movimentações', category: 'Transferências', subcategory: 'TED/DOC', icon: '💸', color: '#FF9800', note: 'Transferências tradicionais entre contas.' },
  { type: 'Movimentações', category: 'Saques', subcategory: 'Saques em Dinheiro', icon: '💵', color: '#9E9E9E', note: 'Retiradas em caixas eletrônicos (ATM).' },
];

interface CategoryData {
  type: string;
  category: string;
  subcategory: string;
  icon: string;
  color: string;
  note: string;
  currentSpent: number;
  suggestedBudget: number;
  monthsWithData: number;
}

interface GroupedCategory {
  icon: string;
  color: string;
  totalSpent: number;
  totalBudget: number;
  subcategories: CategoryData[];
}

interface MonthSummary {
  salary: number;
  fixedBudget: number;
  fixedSpent: number;
  variableBudget: number;
  variableSpent: number;
  investmentsBudget: number;
  investmentsSpent: number;
}

// Componente de Barra de Budget
const BudgetBar: React.FC<{ totalBudget: number; totalSpent: number; compact?: boolean }> = ({ totalBudget, totalSpent, compact = false }) => {
  if (totalBudget === 0) {
    return (
      <div className="mt-3 mb-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-400">Sem budget definido</span>
          <span className="text-gray-600 font-semibold">
            Gasto: R$ {totalSpent.toFixed(2).replace('.', ',')}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100"></div>
      </div>
    );
  }

  const isExceeded = totalSpent > totalBudget;
  const percentage = Math.min((totalSpent / totalBudget) * 100, 100);
  const excessAmount = Math.max(0, totalSpent - totalBudget);
  const remainingAmount = Math.max(0, totalBudget - totalSpent);

  const barColor = isExceeded ? '#FF9800' : '#4CAF50';
  const statusText = isExceeded
    ? `Excedido R$ ${excessAmount.toFixed(2).replace('.', ',')}`
    : `R$ ${remainingAmount.toFixed(2).replace('.', ',')} disponível`;
  const textColor = isExceeded ? '#FF9800' : '#4CAF50';
  const fillWidth = isExceeded ? '100%' : `${percentage}%`;

  return (
    <div className={compact ? "mt-2 mb-1" : "mt-3 mb-2"}>
      <div className={`flex justify-between ${compact ? 'text-[10px]' : 'text-xs'} font-bold mb-1`}>
        <span style={{ color: textColor }}>{statusText}</span>
        <span className="text-gray-500">
          Budget: R$ {totalBudget.toFixed(2).replace('.', ',')}
        </span>
      </div>

      <div className="relative h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="absolute h-full rounded-full transition-all duration-500"
          style={{
            width: fillWidth,
            backgroundColor: barColor,
            boxShadow: isExceeded ? '0 0 8px rgba(255, 152, 0, 0.7)' : 'none',
          }}
        ></div>
      </div>

      {!compact && (
        <div className="text-[10px] text-gray-400 mt-1">
          Gasto: R$ {totalSpent.toFixed(2).replace('.', ',')} {totalBudget > 0 && `(${percentage.toFixed(0)}%)`}
        </div>
      )}
    </div>
  );
};

// Componente de Resumo Financeiro
const FinancialSummary: React.FC<{ summary: MonthSummary; selectedMonth: Date }> = ({ summary, selectedMonth }) => {
  const totalSpent = summary.fixedSpent + summary.variableSpent + summary.investmentsSpent;
  const balance = summary.salary - totalSpent;
  const isNegative = balance < 0;

  // Calcular percentuais em relação ao salário
  const fixedPercent = summary.salary > 0 ? (summary.fixedSpent / summary.salary) * 100 : 0;
  const variablePercent = summary.salary > 0 ? (summary.variableSpent / summary.salary) * 100 : 0;
  const investmentPercent = summary.salary > 0 ? (summary.investmentsSpent / summary.salary) * 100 : 0;

  // Alertas baseados na regra 50/30/20
  const alerts = [];
  if (fixedPercent > 50) {
    alerts.push({ type: 'Custos Fixos', limit: '50%', current: `${fixedPercent.toFixed(0)}%`, color: '#F44336' });
  }
  if (variablePercent > 30) {
    alerts.push({ type: 'Custos Variáveis', limit: '30%', current: `${variablePercent.toFixed(0)}%`, color: '#FF9800' });
  }
  if (investmentPercent > 20) {
    alerts.push({ type: 'Investimentos', limit: '20%', current: `${investmentPercent.toFixed(0)}%`, color: '#2196F3' });
  }

  // Dados para a tabela
  const tableData = [
    { label: 'Custos Fixos', budget: summary.fixedBudget, spent: summary.fixedSpent, color: '#3F51B5', icon: '🔧' },
    { label: 'Custos Variáveis', budget: summary.variableBudget, spent: summary.variableSpent, color: '#FF9800', icon: '🛒' },
    { label: 'Investimentos', budget: summary.investmentsBudget, spent: summary.investmentsSpent, color: '#2196F3', icon: '📈' },
  ];

  // Dados para o gráfico de barras
  const chartData = [
    {
      name: 'Custos Fixos',
      Budget: summary.fixedBudget,
      Gasto: summary.fixedSpent,
    },
    {
      name: 'Custos Variáveis',
      Budget: summary.variableBudget,
      Gasto: summary.variableSpent,
    },
    {
      name: 'Investimentos',
      Budget: summary.investmentsBudget,
      Gasto: summary.investmentsSpent,
    },
  ];

  // Log de comparação entre tabela e gráfico
  console.log('\n📊 [FINANCIAL SUMMARY] Comparação Tabela vs Gráfico:');
  console.log('TABELA:');
  tableData.forEach(item => {
    console.log(`  ${item.label}: Budget R$ ${item.budget.toFixed(2)} | Gasto R$ ${item.spent.toFixed(2)}`);
  });
  console.log('GRÁFICO:');
  chartData.forEach(item => {
    console.log(`  ${item.name}: Budget R$ ${item.Budget.toFixed(2)} | Gasto R$ ${item.Gasto.toFixed(2)}`);
  });
  console.log('');

  const monthLabel = format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="card p-6 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-t-4 border-primary-600">
      <h2 className="text-2xl font-extrabold text-gray-800 mb-4 flex items-center gap-2">
        📊 Resumo Financeiro - {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
      </h2>

      {/* Salário */}
      <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Salário / Receitas</p>
              <p className="text-3xl font-bold text-green-600">
                R$ {summary.salary.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Tabela + Gráfico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Tabela */}
        <div className="bg-white rounded-xl shadow-md p-5">
          <h3 className="font-bold text-gray-800 mb-4 text-lg">📋 Visão Geral</h3>
          <div className="space-y-3">
            {tableData.map((item) => {
              const diff = item.budget - item.spent;
              const isOver = diff < 0;
              return (
                <div key={item.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{item.label}</p>
                      <p className="text-xs text-gray-500">
                        Budget: R$ {item.budget.toFixed(2).replace('.', ',')} | Gasto: R$ {item.spent.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </div>
                  <div className={`text-right font-bold ${isOver ? 'text-red-600' : 'text-green-600'}`}>
                    <p className="text-lg">{isOver ? '-' : ''}R$ {Math.abs(diff).toFixed(2).replace('.', ',')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gráfico de Barras */}
        <div className="bg-white rounded-xl shadow-md p-5">
          <h3 className="font-bold text-gray-800 mb-4 text-lg">📊 Budget vs Gasto</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => `R$ ${Number(value).toFixed(2).replace('.', ',')}`} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <ReferenceLine y={summary.salary} stroke="#4CAF50" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Salário', position: 'right', fill: '#4CAF50', fontSize: 11 }} />
              <Bar dataKey="Budget" fill="#90CAF9" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Gasto" fill="#42A5F5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Saldo Disponível */}
      <div className={`p-5 rounded-xl shadow-lg ${isNegative ? 'bg-red-100 border-l-4 border-red-500' : 'bg-green-100 border-l-4 border-green-500'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isNegative ? (
              <TrendingDown className="w-10 h-10 text-red-600" />
            ) : (
              <TrendingUp className="w-10 h-10 text-green-600" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-700">Saldo Disponível no Mês</p>
              <p className={`text-4xl font-extrabold ${isNegative ? 'text-red-700' : 'text-green-700'}`}>
                {isNegative ? '-' : ''}R$ {Math.abs(balance).toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>
          {!isNegative && (
            <div className="text-right">
              <p className="text-xs text-gray-600">Percentual do salário</p>
              <p className="text-2xl font-bold text-green-600">
                {summary.salary > 0 ? ((balance / summary.salary) * 100).toFixed(0) : 0}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Alertas da Regra 50/30/20 */}
      {alerts.length > 0 && (
        <div className="mt-4 p-4 bg-amber-50 rounded-xl border-l-4 border-amber-500">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h4 className="font-bold text-amber-800 mb-2">⚠️ Atenção: Regra 50/30/20</h4>
              <p className="text-sm text-amber-700 mb-2">
                A distribuição ideal do salário é: <strong>50% Fixos, 30% Variáveis, 20% Investimentos</strong>
              </p>
              <div className="space-y-1">
                {alerts.map((alert, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: alert.color }}></span>
                    <span className="text-amber-800">
                      <strong>{alert.type}</strong>: {alert.current} (limite: {alert.limit})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Budgets() {
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<Record<string, Record<string, GroupedCategory>>>({});
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [monthSummary, setMonthSummary] = useState<MonthSummary>({
    salary: 0,
    fixedBudget: 0,
    fixedSpent: 0,
    variableBudget: 0,
    variableSpent: 0,
    investmentsBudget: 0,
    investmentsSpent: 0,
  });

  useEffect(() => {
    loadTransactions();
  }, [selectedMonth]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      // Buscar transações dos últimos 12 meses para cálculo de médias
      const twelveMonthsAgo = startOfMonth(subMonths(new Date(), 11));
      const startDate = format(twelveMonthsAgo, 'yyyy-MM-dd');

      console.log(`\n🔄 [BUDGETS] ═══════════════════════════════════════════════════`);
      console.log(`🔄 [BUDGETS] CARREGANDO TRANSAÇÕES DA API`);
      console.log(`🔄 [BUDGETS] Data início: ${startDate}`);
      console.log(`🔄 [BUDGETS] ═══════════════════════════════════════════════════\n`);

      const response = await transactionApi.getTransactions({
        start_date: startDate,
        limit: 10000,
      });

      const txs = response.data.transactions;

      console.log(`✅ [BUDGETS] Transações carregadas da API: ${txs.length}`);
      console.log(`📅 [BUDGETS] Período: ${startDate} até hoje`);

      if (txs.length > 0) {
        const firstTx = txs[txs.length - 1];
        const lastTx = txs[0];
        console.log(`📊 [BUDGETS] Primeira transação: ${format(new Date(firstTx.date), 'dd/MM/yyyy')} - ${firstTx.description}`);
        console.log(`📊 [BUDGETS] Última transação: ${format(new Date(lastTx.date), 'dd/MM/yyyy')} - ${lastTx.description}`);
      }

      // Processar transações e calcular médias
      processTransactions(txs);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const processTransactions = (txs: Transaction[]) => {
    console.log('🔍 [BUDGETS] Iniciando processamento de transações');
    console.log(`📅 [BUDGETS] Mês selecionado: ${format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}`);
    console.log(`📊 [BUDGETS] Total de transações: ${txs.length}`);

    const grouped: Record<string, Record<string, GroupedCategory>> = {};

    // Inicializar estrutura com todas as categorias
    ALL_CATEGORY_RULES.forEach((rule) => {
      if (!grouped[rule.type]) {
        grouped[rule.type] = {};
      }
      if (!grouped[rule.type][rule.category]) {
        grouped[rule.type][rule.category] = {
          icon: rule.icon,
          color: rule.color,
          totalSpent: 0,
          totalBudget: 0,
          subcategories: [],
        };
      }
    });

    // Agrupar transações por categoria/subcategoria e calcular gastos
    const subcategoryMap: Record<string, {
      monthlyTotals: Record<string, number>;
      rule: CategoryRule;
      currentMonthSpent: number;
    }> = {};

    ALL_CATEGORY_RULES.forEach((rule) => {
      const key = `${rule.category}::${rule.subcategory}`;
      subcategoryMap[key] = {
        monthlyTotals: {},
        rule,
        currentMonthSpent: 0,
      };
    });

    const currentMonth = format(selectedMonth, 'yyyy-MM');

    // Calcular salário do mês selecionado
    let salary = 0;
    let salaryCount = 0;

    console.log(`\n💰 [BUDGETS] Procurando salários/receitas do mês ${currentMonth}...`);

    txs.forEach((tx) => {
      const month = format(new Date(tx.date), 'yyyy-MM');

      // Detectar receitas (valores positivos) - EXCLUIR transferências recebidas
      if (month === currentMonth && tx.amount > 0) {
        // Ignorar transferências recebidas (PIX/TED recebidos não são salário)
        const isTransferReceived = tx.category === 'Transferências' ||
                                   tx.category === 'PIX' ||
                                   tx.category === 'TED/DOC' ||
                                   (tx.description && (
                                     tx.description.includes('PIX RECEBIDO') ||
                                     tx.description.includes('TED RECEBIDA') ||
                                     tx.description.includes('TRANSFERENCIA RECEBIDA')
                                   ));

        if (!isTransferReceived) {
          console.log(`✅ [BUDGETS] Receita/Salário: ${tx.description || tx.merchant || 'Sem descrição'} - R$ ${tx.amount.toFixed(2)} - Categoria: ${tx.category || 'Sem categoria'}`);
          salary += tx.amount;
          salaryCount++;
        } else {
          console.log(`⚠️ [BUDGETS] Transferência recebida IGNORADA (não conta como salário): ${tx.description || tx.merchant} - R$ ${tx.amount.toFixed(2)}`);
        }
      }
    });

    console.log(`💵 [BUDGETS] Total de salário/receitas (SEM transferências): ${salaryCount} transações = R$ ${salary.toFixed(2)}\n`);

    // Processar despesas
    let processedExpenses = 0;
    let skippedNoCategory = 0;
    let skippedNoRule = 0;

    // Para debug detalhado de transferências
    const transferencias: { description: string; amount: number }[] = [];

    console.log(`💸 [BUDGETS] Processando despesas do mês ${currentMonth}...`);

    txs.forEach((tx) => {
      if (!tx.category) {
        skippedNoCategory++;
        return;
      }

      // Buscar a subcategoria correspondente nas regras
      const matchingRule = ALL_CATEGORY_RULES.find(
        rule => rule.category === tx.category
      );

      if (!matchingRule) {
        if (skippedNoRule < 5) { // Mostrar apenas os primeiros 5
          console.log(`⚠️ [BUDGETS] Categoria não encontrada nas regras: "${tx.category}" - ${tx.description || tx.merchant}`);
        }
        skippedNoRule++;
        return;
      }

      const key = `${matchingRule.category}::${matchingRule.subcategory}`;
      if (subcategoryMap[key]) {
        const month = format(new Date(tx.date), 'yyyy-MM');
        const amount = Math.abs(tx.amount);

        // Somente despesas (valores negativos) para cálculo de budget
        if (tx.amount < 0) {
          if (!subcategoryMap[key].monthlyTotals[month]) {
            subcategoryMap[key].monthlyTotals[month] = 0;
          }
          subcategoryMap[key].monthlyTotals[month] += amount;

          // Gasto do mês selecionado
          if (month === currentMonth) {
            subcategoryMap[key].currentMonthSpent += amount;
            processedExpenses++;

            // Coletar transferências para log detalhado
            if (matchingRule.category === 'Transferências' || matchingRule.category === 'PIX' || matchingRule.category === 'TED/DOC') {
              transferencias.push({ description: tx.description || tx.merchant || 'Sem descrição', amount });
            }

            if (processedExpenses <= 10) { // Mostrar as primeiras 10 despesas gerais
              console.log(`  📌 [${matchingRule.category}] R$ ${amount.toFixed(2)} - ${tx.description || tx.merchant}`);
            }
          }
        }
      }
    });

    console.log(`\n📊 [BUDGETS] Resumo do processamento:`);
    console.log(`  ✅ Despesas processadas: ${processedExpenses}`);
    console.log(`  ⚠️ Sem categoria: ${skippedNoCategory}`);
    console.log(`  ⚠️ Categoria não mapeada: ${skippedNoRule}`);

    // Log detalhado de transferências
    if (transferencias.length > 0) {
      console.log(`\n💸 [BUDGETS] DETALHAMENTO DE TRANSFERÊNCIAS (${transferencias.length} transações):`);
      const totalTransferencias = transferencias.reduce((sum, t) => sum + t.amount, 0);
      transferencias.forEach((t, idx) => {
        console.log(`  ${idx + 1}. R$ ${t.amount.toFixed(2).padStart(12)} - ${t.description}`);
      });
      console.log(`  ═══════════════════════════════════════════════════`);
      console.log(`  📊 TOTAL TRANSFERÊNCIAS: R$ ${totalTransferencias.toFixed(2)}`);
    }

    console.log(``);

    // Calcular médias e montar estrutura final
    let fixedBudget = 0, fixedSpent = 0;
    let variableBudget = 0, variableSpent = 0;
    let investmentsBudget = 0, investmentsSpent = 0;

    console.log(`\n💡 [BUDGETS] Calculando médias e budgets sugeridos...`);

    let categoriesWithData = 0;

    Object.entries(subcategoryMap).forEach(([_key, data]) => {
      const monthlyValues = Object.values(data.monthlyTotals);
      const monthsWithData = monthlyValues.length;
      const avgMonthly = monthsWithData > 0
        ? monthlyValues.reduce((sum, val) => sum + val, 0) / monthsWithData
        : 0;

      const categoryData: CategoryData = {
        type: data.rule.type,
        category: data.rule.category,
        subcategory: data.rule.subcategory,
        icon: data.rule.icon,
        color: data.rule.color,
        note: data.rule.note,
        currentSpent: data.currentMonthSpent,
        suggestedBudget: Math.round(avgMonthly),
        monthsWithData,
      };

      // Log apenas categorias com dados
      if (categoryData.currentSpent > 0 || categoryData.suggestedBudget > 0) {
        categoriesWithData++;
        if (categoriesWithData <= 15) { // Mostrar as primeiras 15
          console.log(`  📊 [${data.rule.type}] ${data.rule.category}: Gasto atual R$ ${categoryData.currentSpent.toFixed(2)} | Budget sugerido R$ ${categoryData.suggestedBudget.toFixed(2)} (média de ${monthsWithData} meses)`);
        }
      }

      // Adicionar à estrutura agrupada
      if (grouped[data.rule.type] && grouped[data.rule.type][data.rule.category]) {
        grouped[data.rule.type][data.rule.category].subcategories.push(categoryData);
        grouped[data.rule.type][data.rule.category].totalSpent += categoryData.currentSpent;
        grouped[data.rule.type][data.rule.category].totalBudget += categoryData.suggestedBudget;
      }

      // Acumular para resumo
      if (data.rule.type === 'Despesas Fixas') {
        fixedBudget += categoryData.suggestedBudget;
        fixedSpent += categoryData.currentSpent;
      } else if (data.rule.type === 'Despesas Variáveis') {
        variableBudget += categoryData.suggestedBudget;
        variableSpent += categoryData.currentSpent;
      } else if (data.rule.type === 'Movimentações' &&
                 (data.rule.category === 'Investimentos' || data.rule.category === 'Transferências' || data.rule.category === 'Saques')) {
        investmentsBudget += categoryData.suggestedBudget;
        investmentsSpent += categoryData.currentSpent;
      }
    });

    console.log(`\n📈 [BUDGETS] ═══════════════════════════════════════════════════`);
    console.log(`📈 [BUDGETS] RESUMO FINANCEIRO - ${format(selectedMonth, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}`);
    console.log(`📈 [BUDGETS] ═══════════════════════════════════════════════════`);
    console.log(`  💰 Salário/Receitas (SEM transferências): R$ ${salary.toFixed(2)}`);
    console.log(`  ───────────────────────────────────────────────────────────`);
    console.log(`  🔧 Despesas Fixas:`);
    console.log(`     Budget: R$ ${fixedBudget.toFixed(2)} | Gasto: R$ ${fixedSpent.toFixed(2)} | Diferença: R$ ${(fixedBudget - fixedSpent).toFixed(2)}`);
    console.log(`  🛒 Despesas Variáveis:`);
    console.log(`     Budget: R$ ${variableBudget.toFixed(2)} | Gasto: R$ ${variableSpent.toFixed(2)} | Diferença: R$ ${(variableBudget - variableSpent).toFixed(2)}`);
    console.log(`  📈 Investimentos/Movimentações:`);
    console.log(`     Budget: R$ ${investmentsBudget.toFixed(2)} | Gasto: R$ ${investmentsSpent.toFixed(2)} | Diferença: R$ ${(investmentsBudget - investmentsSpent).toFixed(2)}`);
    console.log(`  ───────────────────────────────────────────────────────────`);
    console.log(`  💵 Saldo Disponível: R$ ${(salary - fixedSpent - variableSpent - investmentsSpent).toFixed(2)}`);
    console.log(`📈 [BUDGETS] ═══════════════════════════════════════════════════`);
    console.log(`\n✅ [BUDGETS] Processamento concluído!\n`);

    setMonthSummary({
      salary,
      fixedBudget,
      fixedSpent,
      variableBudget,
      variableSpent,
      investmentsBudget,
      investmentsSpent,
    });

    setCategoryData(grouped);
  };

  const costTypes = Object.keys(categoryData);

  const handlePreviousMonth = () => {
    setSelectedMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    const nextMonth = addMonths(selectedMonth, 1);
    if (nextMonth <= new Date()) {
      setSelectedMonth(nextMonth);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando budgets...</p>
        </div>
      </div>
    );
  }

  const isCurrentMonth = format(selectedMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM');

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen pb-20 lg:pb-6">
      <header className="max-w-6xl mx-auto mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
              🎯 Budgets por Categoria
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-2">
              Orçamentos sugeridos baseados na média dos últimos meses. Clique em uma categoria para ver detalhes.
            </p>
          </div>

          {/* Seletor de Mês */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow-md p-2">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Mês anterior"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="px-4 py-2 text-center min-w-[140px]">
              <p className="text-sm font-bold text-gray-800">
                {format(selectedMonth, 'MMMM yyyy', { locale: ptBR }).charAt(0).toUpperCase() +
                 format(selectedMonth, 'MMMM yyyy', { locale: ptBR }).slice(1)}
              </p>
            </div>
            <button
              onClick={handleNextMonth}
              disabled={isCurrentMonth}
              className={`p-2 rounded-lg transition ${
                isCurrentMonth ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100'
              }`}
              title={isCurrentMonth ? 'Mês atual' : 'Próximo mês'}
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
        {/* Resumo Financeiro */}
        <FinancialSummary summary={monthSummary} selectedMonth={selectedMonth} />

        {/* Categorias */}
        <main className="space-y-8 sm:space-y-12">
          {costTypes.map((costType) => (
            <section key={costType}>
              <h2
                className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 pb-2 border-b-2 text-gray-700"
                style={{
                  borderColor:
                    costType === 'Despesas Fixas'
                      ? '#3F51B5'
                      : costType === 'Despesas Variáveis'
                      ? '#FF9800'
                      : '#4CAF50',
                }}
              >
                {costType}
                <span className="text-xs sm:text-sm font-medium ml-2 sm:ml-3 text-gray-500">
                  ({Object.keys(categoryData[costType]).length} Categorias Principais)
                </span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {Object.entries(categoryData[costType]).map(([categoryName, data]) => {
                  const categoryPath = `/app/budgets/${encodeURIComponent(categoryName)}`;
                  return (
                    <Link
                      key={categoryName}
                      to={categoryPath}
                      className="block bg-white rounded-2xl shadow-xl border-t-4 p-4 sm:p-5 transform hover:scale-[1.02] transition duration-300 cursor-pointer hover:shadow-2xl"
                      style={{ borderTopColor: data.color }}
                      onClick={(e) => {
                        console.log(`🖱️ [BUDGETS] Card clicado: ${categoryName} -> ${categoryPath}`);
                      }}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 mb-3">
                        <span className="text-2xl sm:text-3xl">{data.icon}</span>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 uppercase tracking-wider flex-1">
                          {categoryName}
                        </h3>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>

                      <BudgetBar totalBudget={data.totalBudget} totalSpent={data.totalSpent} />

                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          {data.subcategories.length} subcategoria{data.subcategories.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}

          {costTypes.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum dado disponível</h3>
              <p className="text-gray-500 mb-4">
                Conecte sua conta bancária para começar a gerenciar seus budgets.
              </p>
              <Link
                to="/app/connect-bank"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                Conectar Banco <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </main>

        <footer className="max-w-6xl mx-auto mt-8 sm:mt-12 text-center text-xs text-gray-400">
          <p>Budgets calculados automaticamente com base no histórico de transações.</p>
        </footer>
      </div>
    </div>
  );
}
