import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { transactionApi, budgetApi } from '../services/api';
import type { Transaction } from '../types';
import { startOfMonth, subMonths, format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight, TrendingUp, ChevronLeft, ChevronRight, AlertTriangle, TrendingDown, Wallet } from 'lucide-react';
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
    { label: 'Custo com Investimentos', budget: summary.investmentsBudget, spent: summary.investmentsSpent, color: '#2196F3', icon: '📈' },
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
      name: 'Custo com Invest.',
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
    <div className="card p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-t-4 border-primary-600">
      <h2 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
        📊 Resumo Financeiro - {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
      </h2>

      {/* Salário */}
      <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white rounded-xl shadow-sm border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xl sm:text-2xl">💰</span>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600 font-medium">Salário / Receitas</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600">
                R$ {summary.salary.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Tabela + Gráfico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Visão Geral - Design Profissional */}
        <div className="bg-white rounded-xl lg:rounded-2xl shadow-md border border-gray-200 p-3 sm:p-4 lg:p-6">
          <div className="flex items-center gap-2 mb-3 sm:mb-5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg sm:text-2xl">📋</span>
            </div>
            <h3 className="font-bold text-gray-800 text-base sm:text-lg lg:text-xl">Visão Geral</h3>
          </div>

          {/* Grid de 3 colunas x 3 linhas (Mobile: stack vertical) */}
          <div className="space-y-3 sm:space-y-4 mb-3 sm:mb-5">
            {tableData.map((item) => {
              const diff = item.budget - item.spent;
              const isOver = diff < 0;
              const percentage = item.budget > 0 ? Math.min((item.spent / item.budget) * 100, 100) : 0;
              const statusText = isOver
                ? `R$ ${Math.abs(diff).toFixed(2).replace('.', ',')} excedido`
                : `R$ ${Math.abs(diff).toFixed(2).replace('.', ',')} ainda disponível`;

              return (
                <div key={item.label} className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start sm:items-center">
                  {/* Coluna 1: Gasto */}
                  <div className="bg-blue-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-100 flex-shrink-0">
                        <span className="text-lg sm:text-2xl">{item.icon}</span>
                      </div>
                      <p className="font-bold text-gray-800 text-xs sm:text-sm">{item.label}</p>
                    </div>
                    <p className="text-xs font-medium text-gray-600 mb-0.5 sm:mb-1">Gasto</p>
                    <p className="text-base sm:text-lg lg:text-xl font-extrabold text-blue-600">
                      R$ {item.spent.toFixed(2).replace('.', ',')}
                    </p>
                  </div>

                  {/* Coluna 2: Budget */}
                  <div className="bg-purple-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-100 flex-shrink-0">
                        <span className="text-lg sm:text-2xl">{item.icon}</span>
                      </div>
                      <p className="font-bold text-gray-800 text-xs sm:text-sm">{item.label}</p>
                    </div>
                    <p className="text-xs font-medium text-gray-600 mb-0.5 sm:mb-1">Budget</p>
                    <p className="text-base sm:text-lg lg:text-xl font-extrabold text-purple-600">
                      R$ {item.budget.toFixed(2).replace('.', ',')}
                    </p>
                  </div>

                  {/* Coluna 3: Status + Barra de Progresso */}
                  <div className="flex flex-col justify-center">
                    {/* Texto de Status acima da barra */}
                    <div className="mb-1 sm:mb-2">
                      <p className={`text-xs sm:text-sm font-bold ${isOver ? 'text-orange-600' : 'text-emerald-600'}`}>
                        {statusText}
                      </p>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="relative h-6 sm:h-8 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
                      <div
                        className="absolute h-full rounded-lg transition-all duration-500"
                        style={{
                          width: isOver ? '100%' : `${percentage}%`,
                          background: isOver
                            ? 'linear-gradient(135deg, #FB923C 0%, #F97316 100%)'
                            : 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                          boxShadow: isOver
                            ? '0 0 8px rgba(251, 146, 60, 0.3)'
                            : '0 0 8px rgba(16, 185, 129, 0.3)',
                        }}
                      ></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs sm:text-sm font-extrabold text-white drop-shadow-md">
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Linha de Subtotais */}
          <div className="border-t-2 border-gray-200 pt-3 sm:pt-5">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {/* Total Gasto */}
              <div className="bg-blue-500 rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-5 shadow-md text-center transform hover:scale-105 transition-transform">
                <p className="text-[10px] sm:text-xs font-bold text-blue-50 mb-1 sm:mb-2 uppercase tracking-wide sm:tracking-wider">Total Gasto</p>
                <p className="text-sm sm:text-lg lg:text-2xl font-extrabold text-white break-words">
                  R$ {(summary.fixedSpent + summary.variableSpent + summary.investmentsSpent).toFixed(2).replace('.', ',')}
                </p>
              </div>

              {/* Total Budget */}
              <div className="bg-purple-500 rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-5 shadow-md text-center transform hover:scale-105 transition-transform">
                <p className="text-[10px] sm:text-xs font-bold text-purple-50 mb-1 sm:mb-2 uppercase tracking-wide sm:tracking-wider">Total Budget</p>
                <p className="text-sm sm:text-lg lg:text-2xl font-extrabold text-white break-words">
                  R$ {(summary.fixedBudget + summary.variableBudget + summary.investmentsBudget).toFixed(2).replace('.', ',')}
                </p>
              </div>

              {/* Total Diferença */}
              <div className={`rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-5 shadow-md text-center transform hover:scale-105 transition-transform ${
                (summary.fixedBudget + summary.variableBudget + summary.investmentsBudget) -
                (summary.fixedSpent + summary.variableSpent + summary.investmentsSpent) < 0
                  ? 'bg-orange-500'
                  : 'bg-emerald-500'
              }`}>
                <p className={`text-[10px] sm:text-xs font-bold mb-1 sm:mb-2 uppercase tracking-wide sm:tracking-wider ${
                  (summary.fixedBudget + summary.variableBudget + summary.investmentsBudget) -
                  (summary.fixedSpent + summary.variableSpent + summary.investmentsSpent) < 0
                    ? 'text-orange-50'
                    : 'text-emerald-50'
                }`}>Diferença</p>
                <p className="text-sm sm:text-lg lg:text-2xl font-extrabold text-white break-words">
                  {((summary.fixedBudget + summary.variableBudget + summary.investmentsBudget) -
                    (summary.fixedSpent + summary.variableSpent + summary.investmentsSpent) < 0)
                    ? '-'
                    : ''
                  }R$ {Math.abs(
                    (summary.fixedBudget + summary.variableBudget + summary.investmentsBudget) -
                    (summary.fixedSpent + summary.variableSpent + summary.investmentsSpent)
                  ).toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de Barras - Design Profissional */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-bold text-gray-800 text-xl">Budget vs Gastos</h3>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="budgetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="gastoGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 600 }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: any) => `R$ ${Number(value).toFixed(2).replace('.', ',')}`}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                  labelStyle={{ color: '#1F2937', fontWeight: 700 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '13px', fontWeight: 600 }}
                  iconType="circle"
                />
                <ReferenceLine
                  y={summary.salary}
                  stroke="#10B981"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: 'Salário',
                    position: 'right',
                    fill: '#059669',
                    fontSize: 11,
                    fontWeight: 600,
                    offset: 10,
                  }}
                />
                <Bar
                  dataKey="Budget"
                  fill="url(#budgetGradient)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={60}
                />
                <Bar
                  dataKey="Gasto"
                  fill="url(#gastoGradient)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Saldo Disponível */}
      <div className={`p-3 sm:p-4 lg:p-5 rounded-xl shadow-lg ${isNegative ? 'bg-red-100 border-l-4 border-red-500' : 'bg-green-100 border-l-4 border-green-500'}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-3">
            {isNegative ? (
              <TrendingDown className="w-8 h-8 sm:w-10 sm:h-10 text-red-600 flex-shrink-0" />
            ) : (
              <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 flex-shrink-0" />
            )}
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-700">Saldo Disponível no Mês</p>
              <p className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold ${isNegative ? 'text-red-700' : 'text-green-700'}`}>
                {isNegative ? '-' : ''}R$ {Math.abs(balance).toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>
          {!isNegative && (
            <div className="text-left sm:text-right w-full sm:w-auto">
              <p className="text-xs text-gray-600">Percentual do salário</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {summary.salary > 0 ? ((balance / summary.salary) * 100).toFixed(0) : 0}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Alertas da Regra 50/30/20 */}
      {alerts.length > 0 && (
        <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-amber-50 rounded-xl border-l-4 border-amber-500">
          <div className="flex items-start gap-2 sm:gap-3">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h4 className="font-bold text-amber-800 mb-2 text-sm sm:text-base">⚠️ Atenção: Regra 50/30/20</h4>
              <p className="text-xs sm:text-sm text-amber-700 mb-2">
                A distribuição ideal do salário é: <strong>50% Fixos, 30% Variáveis, 20% Investimentos</strong>
              </p>
              <div className="space-y-1">
                {alerts.map((alert, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: alert.color }}></span>
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
  const [customBudgets, setCustomBudgets] = useState<Record<string, number>>({});
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
    loadBudgets();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [selectedMonth, customBudgets]);

  const loadBudgets = async () => {
    try {
      const response = await budgetApi.getAllBudgets();
      setCustomBudgets(response.data);
      console.log(`📂 [BUDGETS] Budgets customizados carregados da API:`, response.data);
    } catch (error) {
      console.error(`❌ [BUDGETS] Erro ao carregar budgets:`, error);
      setCustomBudgets({});
    }
  };

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
      // Separar Movimentações em Despesas e Receitas
      let effectiveType = rule.type;
      if (rule.type === 'Movimentações') {
        if (rule.category === 'Investimentos' || rule.category === 'Transferências' || rule.category === 'Saques') {
          effectiveType = 'Movimentações (Despesas)';
        } else if (rule.category === 'Salário' || rule.category === 'Receitas') {
          effectiveType = 'Movimentações (Receitas)';
        }
      }

      if (!grouped[effectiveType]) {
        grouped[effectiveType] = {};
      }
      if (!grouped[effectiveType][rule.category]) {
        grouped[effectiveType][rule.category] = {
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

    // Mapa para acumular totais por categoria principal
    const categoryTotals: Record<string, {
      type: string;
      totalAllMonths: number;
      currentMonthSpent: number;
      monthlyBreakdown: Record<string, number>;
    }> = {};

    // Arrays para log de somas
    const fixedItems: Array<{cat: string, subcat: string, budget: number, spent: number}> = [];
    const variableItems: Array<{cat: string, subcat: string, budget: number, spent: number}> = [];
    const investmentItems: Array<{cat: string, subcat: string, budget: number, spent: number}> = [];

    // Usar budgets customizados carregados do estado (já vem da API)
    const customBudgetCount = Object.keys(customBudgets).length;

    if (customBudgetCount > 0) {
      console.log(`\n📝 [BUDGETS] ${customBudgetCount} budget(s) customizado(s) encontrado(s):`);
      Object.entries(customBudgets).forEach(([cat, value]) => {
        console.log(`     • ${cat}: R$ ${(value as number).toFixed(2)}`);
      });
      console.log('');
    }

    // Primeiro, processar todas as subcategorias para calcular gastos
    Object.entries(subcategoryMap).forEach(([_key, data]) => {
      const monthlyValues = Object.values(data.monthlyTotals);
      const monthsWithData = monthlyValues.length;
      const avgMonthly = monthsWithData > 0
        ? monthlyValues.reduce((sum, val) => sum + val, 0) / monthsWithData
        : 0;

      // Determinar tipo efetivo (separar Movimentações)
      let effectiveType = data.rule.type;
      if (data.rule.type === 'Movimentações') {
        if (data.rule.category === 'Investimentos' || data.rule.category === 'Transferências' || data.rule.category === 'Saques') {
          effectiveType = 'Movimentações (Despesas)';
        } else if (data.rule.category === 'Salário' || data.rule.category === 'Receitas') {
          effectiveType = 'Movimentações (Receitas)';
        }
      }

      const categoryData: CategoryData = {
        type: effectiveType,
        category: data.rule.category,
        subcategory: data.rule.subcategory,
        icon: data.rule.icon,
        color: data.rule.color,
        note: data.rule.note,
        currentSpent: data.currentMonthSpent,
        suggestedBudget: Math.round(avgMonthly), // Budget da subcategoria (média)
        monthsWithData,
      };

      // Acumular totais por categoria principal
      if (!categoryTotals[data.rule.category]) {
        categoryTotals[data.rule.category] = {
          type: effectiveType,
          totalAllMonths: 0,
          currentMonthSpent: 0,
          monthlyBreakdown: {},
        };
      }

      // Somar todos os valores mensais
      Object.entries(data.monthlyTotals).forEach(([month, value]) => {
        categoryTotals[data.rule.category].totalAllMonths += value;
        if (!categoryTotals[data.rule.category].monthlyBreakdown[month]) {
          categoryTotals[data.rule.category].monthlyBreakdown[month] = 0;
        }
        categoryTotals[data.rule.category].monthlyBreakdown[month] += value;
      });
      categoryTotals[data.rule.category].currentMonthSpent += data.currentMonthSpent;

      // Adicionar à estrutura agrupada
      if (grouped[effectiveType] && grouped[effectiveType][data.rule.category]) {
        grouped[effectiveType][data.rule.category].subcategories.push(categoryData);
        grouped[effectiveType][data.rule.category].totalSpent += categoryData.currentSpent;
        // NÃO somar budget aqui - será calculado depois por categoria
      }
    });

    // Agora calcular budgets POR CATEGORIA PRINCIPAL (não por subcategoria)
    Object.keys(grouped).forEach((type) => {
      Object.keys(grouped[type]).forEach((categoryName) => {
        const category = grouped[type][categoryName];

        // Se existe budget customizado, usar ele. Senão, calcular média da categoria toda
        const customBudget = customBudgets[categoryName];
        let categoryBudget: number;

        if (customBudget) {
          categoryBudget = customBudget;
        } else {
          // Calcular média de TODAS as subcategorias juntas
          const allSubcategoriesBudgets = category.subcategories
            .map(sub => sub.suggestedBudget)
            .reduce((sum, val) => sum + val, 0);
          categoryBudget = allSubcategoriesBudgets;
        }

        category.totalBudget = categoryBudget;

        // Log
        const budgetSource = customBudget ? '✏️ CUSTOMIZADO' : 'média calculada';
        console.log(`  📊 [${type}] ${categoryName}: Gasto R$ ${category.totalSpent.toFixed(2)} | Budget R$ ${categoryBudget.toFixed(2)} (${budgetSource})`);

        // Acumular para resumo da Visão Geral
        if (type === 'Despesas Fixas') {
          fixedBudget += categoryBudget;
          fixedSpent += category.totalSpent;
          fixedItems.push({
            cat: categoryName,
            subcat: `${category.subcategories.length} subcategorias`,
            budget: categoryBudget,
            spent: category.totalSpent
          });
        } else if (type === 'Despesas Variáveis') {
          variableBudget += categoryBudget;
          variableSpent += category.totalSpent;
          variableItems.push({
            cat: categoryName,
            subcat: `${category.subcategories.length} subcategorias`,
            budget: categoryBudget,
            spent: category.totalSpent
          });
        } else if (type === 'Movimentações (Despesas)') {
          // Movimentações de despesas (Investimentos, Transferências, Saques)
          investmentsBudget += categoryBudget;
          investmentsSpent += category.totalSpent;
          investmentItems.push({
            cat: categoryName,
            subcat: `${category.subcategories.length} subcategorias`,
            budget: categoryBudget,
            spent: category.totalSpent
          });
        }
        // Movimentações (Receitas) não entram na Visão Geral pois são entradas de dinheiro
      });
    });

    // Log detalhado das somas para "Visão Geral"
    console.log(`\n💰 [BUDGETS] ═══════════════════════════════════════════════════`);
    console.log(`💰 [BUDGETS] CÁLCULO DAS SOMAS PARA "VISÃO GERAL"`);
    console.log(`💰 [BUDGETS] ═══════════════════════════════════════════════════`);

    console.log(`\n  🔧 DESPESAS FIXAS (${fixedItems.length} itens):`);
    fixedItems.forEach((item, idx) => {
      console.log(`     ${idx + 1}. [${item.cat}] ${item.subcat}:`);
      console.log(`        Budget: R$ ${item.budget.toFixed(2)} | Gasto: R$ ${item.spent.toFixed(2)}`);
    });
    console.log(`     ────────────────────────────────────────────────────`);
    console.log(`     ✅ TOTAL FIXAS: Budget R$ ${fixedBudget.toFixed(2)} | Gasto R$ ${fixedSpent.toFixed(2)}`);

    console.log(`\n  🛒 DESPESAS VARIÁVEIS (${variableItems.length} itens):`);
    variableItems.forEach((item, idx) => {
      console.log(`     ${idx + 1}. [${item.cat}] ${item.subcat}:`);
      console.log(`        Budget: R$ ${item.budget.toFixed(2)} | Gasto: R$ ${item.spent.toFixed(2)}`);
    });
    console.log(`     ────────────────────────────────────────────────────`);
    console.log(`     ✅ TOTAL VARIÁVEIS: Budget R$ ${variableBudget.toFixed(2)} | Gasto R$ ${variableSpent.toFixed(2)}`);

    console.log(`\n  📈 INVESTIMENTOS/MOVIMENTAÇÕES (${investmentItems.length} itens):`);
    investmentItems.forEach((item, idx) => {
      console.log(`     ${idx + 1}. [${item.cat}] ${item.subcat}:`);
      console.log(`        Budget: R$ ${item.budget.toFixed(2)} | Gasto: R$ ${item.spent.toFixed(2)}`);
    });
    console.log(`     ────────────────────────────────────────────────────`);
    console.log(`     ✅ TOTAL INVESTIMENTOS: Budget R$ ${investmentsBudget.toFixed(2)} | Gasto R$ ${investmentsSpent.toFixed(2)}`);

    console.log(`\n💰 [BUDGETS] ═══════════════════════════════════════════════════`);

    // Log detalhado de totais por categoria (todos os meses)
    console.log(`\n📊 [BUDGETS] ═══════════════════════════════════════════════════`);
    console.log(`📊 [BUDGETS] TOTAIS POR CATEGORIA - TODOS OS MESES`);
    console.log(`📊 [BUDGETS] ═══════════════════════════════════════════════════`);

    Object.entries(categoryTotals)
      .sort((a, b) => b[1].totalAllMonths - a[1].totalAllMonths) // Ordenar por total decrescente
      .forEach(([categoryName, totals]) => {
        console.log(`\n  📌 ${categoryName} (${totals.type}):`);
        console.log(`     💰 TOTAL ACUMULADO (todos os meses): R$ ${totals.totalAllMonths.toFixed(2)}`);
        console.log(`     🗓️  Gasto no mês atual (${format(selectedMonth, 'MMM/yyyy', { locale: ptBR })}): R$ ${totals.currentMonthSpent.toFixed(2)}`);
        console.log(`     📅 Breakdown mensal:`);

        // Mostrar os valores mensais ordenados por data
        const sortedMonths = Object.entries(totals.monthlyBreakdown).sort((a, b) => a[0].localeCompare(b[0]));
        sortedMonths.forEach(([month, value]) => {
          const monthDate = new Date(month + '-01');
          const monthLabel = format(monthDate, 'MMM/yyyy', { locale: ptBR });
          const isCurrent = month === currentMonth ? ' ← MÊS ATUAL' : '';
          console.log(`        ${monthLabel}: R$ ${value.toFixed(2).padStart(12)}${isCurrent}`);
        });
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

  // Log dos cards que serão renderizados
  useEffect(() => {
    if (!loading && Object.keys(categoryData).length > 0) {
      console.log('\n🎴 [BUDGETS] Cards que serão renderizados:');
      Object.entries(categoryData).forEach(([costType, categories]) => {
        console.log(`\n  📦 ${costType}:`);
        Object.entries(categories).forEach(([categoryName, data]) => {
          const categoryPath = `/app/budgets/${encodeURIComponent(categoryName)}`;
          console.log(`     • ${categoryName} → ${categoryPath}`);
          console.log(`       Gasto: R$ ${data.totalSpent.toFixed(2)} | Budget: R$ ${data.totalBudget.toFixed(2)}`);
        });
      });
      console.log('\n');
    }
  }, [categoryData, loading]);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <header className="mb-4 sm:mb-6 lg:mb-8">
        {/* Título e Botão Conectar Banco */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-3 sm:mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 flex items-center gap-2">
              🎯 Budgets por Categoria
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-gray-500 mt-1 sm:mt-2">
              Orçamentos sugeridos baseados na média dos últimos meses. Clique em uma categoria para ver detalhes.
            </p>
          </div>
          <Link to="/app/connect-bank" className="btn-primary flex items-center space-x-2 w-full sm:w-auto justify-center">
            <Wallet className="w-4 sm:w-5 h-4 sm:h-5" />
            <span className="text-sm sm:text-base">Conectar Banco</span>
          </Link>
        </div>

        {/* Seletor de Mês - Centralizado em mobile */}
        <div className="flex justify-center sm:justify-end">
          <div className="flex items-center gap-1 sm:gap-2 bg-white rounded-lg shadow-md p-1.5 sm:p-2">
            <button
              onClick={handlePreviousMonth}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </button>
            <div className="px-3 sm:px-4 py-1.5 sm:py-2 text-center min-w-[120px] sm:min-w-[140px]">
              <p className="text-xs sm:text-sm font-bold text-gray-800">
                {format(selectedMonth, 'MMMM yyyy', { locale: ptBR }).charAt(0).toUpperCase() +
                 format(selectedMonth, 'MMMM yyyy', { locale: ptBR }).slice(1)}
              </p>
            </div>
            <button
              onClick={handleNextMonth}
              disabled={isCurrentMonth}
              className={`p-1.5 sm:p-2 rounded-lg transition ${
                isCurrentMonth ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100'
              }`}
              title={isCurrentMonth ? 'Mês atual' : 'Próximo mês'}
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
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
                      : costType === 'Movimentações (Despesas)'
                      ? '#F44336'
                      : '#4CAF50',
                }}
              >
                {costType}
                <span className="text-xs sm:text-sm font-medium ml-2 sm:ml-3 text-gray-500">
                  ({Object.keys(categoryData[costType]).length} Categorias Principais)
                </span>
                {costType === 'Movimentações (Receitas)' && (
                  <span className="block text-xs font-normal text-gray-500 mt-1">
                    💡 Receitas não têm budget pois são entradas de dinheiro
                  </span>
                )}
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
                      onClick={() => {
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

                      {/* Mostrar BudgetBar apenas para categorias que não são Receitas */}
                      {costType !== 'Movimentações (Receitas)' ? (
                        <BudgetBar totalBudget={data.totalBudget} totalSpent={data.totalSpent} />
                      ) : (
                        <div className="mt-3 mb-2">
                          <div className="text-sm font-bold text-green-600">
                            💰 R$ {data.totalSpent.toFixed(2).replace('.', ',')}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Total de receitas no mês</p>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-700 mb-2">
                          {data.subcategories.length} subcategoria{data.subcategories.length !== 1 ? 's' : ''}:
                        </p>
                        <ul className="text-[10px] text-gray-500 space-y-1">
                          {data.subcategories.slice(0, 3).map((sub, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-gray-400">•</span>
                              <span className="flex-1">
                                {sub.subcategory}
                                <span className="text-gray-400 italic ml-1">
                                  ({sub.note.split('.')[0]})
                                </span>
                              </span>
                            </li>
                          ))}
                          {data.subcategories.length > 3 && (
                            <li className="text-gray-400 italic">
                              +{data.subcategories.length - 3} mais...
                            </li>
                          )}
                        </ul>
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
