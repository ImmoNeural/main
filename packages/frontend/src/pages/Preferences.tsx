import { useEffect, useState } from 'react';
import { Settings, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { preferencesApi, PreferenceItem } from '../services/api';

// Definição de todas as subcategorias do sistema com sua classificação padrão
interface SubcategoryConfig {
  category: string;
  subcategory: string;
  icon: string;
  defaultTipo: 'fixo' | 'variavel';
  description: string;
}

const SUBCATEGORIES_CONFIG: SubcategoryConfig[] = [
  // ALIMENTAÇÃO
  { category: 'Alimentação', subcategory: 'Restaurantes e Delivery', icon: '🍕', defaultTipo: 'variavel', description: 'Restaurantes, lanchonetes e apps de delivery' },
  { category: 'Alimentação', subcategory: 'Padaria', icon: '🥖', defaultTipo: 'variavel', description: 'Padarias e panificadoras' },

  // SUPERMERCADO
  { category: 'Supermercado', subcategory: 'Compras de Mercado', icon: '🛒', defaultTipo: 'variavel', description: 'Grandes redes e atacados' },

  // TRANSPORTE
  { category: 'Transporte', subcategory: 'Apps de Transporte', icon: '🚗', defaultTipo: 'variavel', description: 'Uber, 99, Cabify' },
  { category: 'Transporte', subcategory: 'Combustível e Pedágio', icon: '⛽', defaultTipo: 'variavel', description: 'Postos e tags de pedágio' },
  { category: 'Transporte', subcategory: 'Transporte Público', icon: '🚌', defaultTipo: 'variavel', description: 'Metrô, trem e ônibus' },
  { category: 'Transporte', subcategory: 'Estacionamentos', icon: '🅿️', defaultTipo: 'variavel', description: 'Estacionamentos rotativos e garagens' },
  { category: 'Transporte', subcategory: 'Seguros', icon: '🛡️', defaultTipo: 'fixo', description: 'Seguro auto, moto, veículo' },

  // SAÚDE
  { category: 'Saúde', subcategory: 'Farmácias e Drogarias', icon: '💊', defaultTipo: 'variavel', description: 'Compra de remédios' },
  { category: 'Saúde', subcategory: 'Academia e Fitness', icon: '🏋️', defaultTipo: 'fixo', description: 'Mensalidades de academias' },
  { category: 'Saúde', subcategory: 'Odontologia', icon: '🦷', defaultTipo: 'fixo', description: 'Planos dentários e mensalidades' },
  { category: 'Saúde', subcategory: 'Médicos e Clínicas', icon: '⚕️', defaultTipo: 'fixo', description: 'Plano de saúde, convênios' },

  // ENTRETENIMENTO
  { category: 'Entretenimento', subcategory: 'Streaming e Assinaturas', icon: '📺', defaultTipo: 'fixo', description: 'Netflix, Spotify, Disney+' },
  { category: 'Entretenimento', subcategory: 'Lazer e Diversão', icon: '🎮', defaultTipo: 'variavel', description: 'Cinema, teatro, shows' },

  // EDUCAÇÃO
  { category: 'Educação', subcategory: 'Cursos e Ensino', icon: '🎓', defaultTipo: 'fixo', description: 'Mensalidades escolares e cursos' },
  { category: 'Educação', subcategory: 'Livrarias e Papelarias', icon: '📚', defaultTipo: 'variavel', description: 'Livros e material didático' },

  // COMPRAS
  { category: 'Compras', subcategory: 'E-commerce', icon: '🛍️', defaultTipo: 'variavel', description: 'Mercado Livre, Amazon, Magalu' },
  { category: 'Compras', subcategory: 'Moda e Vestuário', icon: '👕', defaultTipo: 'variavel', description: 'Roupas e calçados' },
  { category: 'Compras', subcategory: 'Tecnologia', icon: '📱', defaultTipo: 'variavel', description: 'Eletrônicos e gadgets' },

  // CASA
  { category: 'Casa', subcategory: 'Construção e Reforma', icon: '🏠', defaultTipo: 'variavel', description: 'Materiais de construção' },
  { category: 'Casa', subcategory: 'Móveis e Decoração', icon: '🛋️', defaultTipo: 'variavel', description: 'Móveis e artigos de decoração' },

  // CONTAS
  { category: 'Contas', subcategory: 'Telefonia e Internet', icon: '📱', defaultTipo: 'fixo', description: 'Planos de telefone e internet' },
  { category: 'Contas', subcategory: 'Energia e Água', icon: '⚡', defaultTipo: 'fixo', description: 'Contas de luz e água' },
  { category: 'Contas', subcategory: 'Boletos e Débitos', icon: '📄', defaultTipo: 'variavel', description: 'Boletos diversos' },
  { category: 'Contas', subcategory: 'Condomínio', icon: '🏢', defaultTipo: 'fixo', description: 'Taxa condominial e administração' },
  { category: 'Contas', subcategory: 'Aluguel de Eletrodomésticos', icon: '🔌', defaultTipo: 'fixo', description: 'Locação de geladeira, máquina de lavar, etc.' },
  { category: 'Contas', subcategory: 'Aluguel de Imóvel', icon: '🏠', defaultTipo: 'fixo', description: 'Aluguel de casa, apartamento ou sala comercial' },

  // BANCO E SEGURADORAS
  { category: 'Banco e Seguradoras', subcategory: 'Bancos e Fintechs', icon: '🏦', defaultTipo: 'fixo', description: 'Tarifas bancárias' },
  { category: 'Banco e Seguradoras', subcategory: 'Seguradoras', icon: '🛡️', defaultTipo: 'fixo', description: 'Seguros diversos' },
  { category: 'Banco e Seguradoras', subcategory: 'Empréstimos Bancários', icon: '💰', defaultTipo: 'fixo', description: 'Parcelas de empréstimos' },
  { category: 'Banco e Seguradoras', subcategory: 'Financiamentos', icon: '📋', defaultTipo: 'fixo', description: 'Parcelas de financiamentos' },
  { category: 'Banco e Seguradoras', subcategory: 'Cheque Especial', icon: '💳', defaultTipo: 'variavel', description: 'Juros de cheque especial e limite de conta' },

  // PET
  { category: 'Pet', subcategory: 'Alimentação', icon: '🦴', defaultTipo: 'variavel', description: 'Ração e petiscos' },
  { category: 'Pet', subcategory: 'Médico', icon: '🏥', defaultTipo: 'variavel', description: 'Consultas veterinárias' },
  { category: 'Pet', subcategory: 'Tratamentos', icon: '💊', defaultTipo: 'variavel', description: 'Vacinas e medicamentos' },
  { category: 'Pet', subcategory: 'Seguradoras', icon: '🛡️', defaultTipo: 'fixo', description: 'Plano de saúde pet' },

  // VIAGENS
  { category: 'Viagens', subcategory: 'Aéreo e Turismo', icon: '✈️', defaultTipo: 'variavel', description: 'Passagens e hospedagem' },

  // IMPOSTOS
  { category: 'Impostos e Taxas', subcategory: 'IOF e Impostos', icon: '🏦', defaultTipo: 'fixo', description: 'Impostos e taxas' },

  // INVESTIMENTOS
  { category: 'Investimentos', subcategory: 'Aplicações e Investimentos', icon: '📈', defaultTipo: 'variavel', description: 'Aplicações em investimentos' },

  // SAQUES
  { category: 'Saques', subcategory: 'Saques em Dinheiro', icon: '💵', defaultTipo: 'variavel', description: 'Retiradas em caixas eletrônicos' },

  // TRANSFERÊNCIAS
  { category: 'Transferências', subcategory: 'PIX', icon: '💸', defaultTipo: 'variavel', description: 'Transferências PIX' },
  { category: 'Transferências', subcategory: 'TED/DOC', icon: '💸', defaultTipo: 'variavel', description: 'Transferências tradicionais' },
];

interface PreferenceState {
  [key: string]: 'fixo' | 'variavel';
}

export const Preferences = () => {
  const [preferences, setPreferences] = useState<PreferenceState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Agrupar subcategorias por categoria
  const groupedSubcategories = SUBCATEGORIES_CONFIG.reduce((acc, config) => {
    if (!acc[config.category]) {
      acc[config.category] = [];
    }
    acc[config.category].push(config);
    return acc;
  }, {} as Record<string, SubcategoryConfig[]>);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      // Carregar preferências do backend
      const response = await preferencesApi.getAll();
      const savedPrefs = response.data;

      // Criar mapa de preferências
      const prefs: PreferenceState = {};

      // Primeiro, definir valores padrão
      SUBCATEGORIES_CONFIG.forEach((config) => {
        const key = `${config.category}|${config.subcategory}`;
        prefs[key] = config.defaultTipo;
      });

      // Depois, sobrescrever com valores do banco se existirem
      if (Array.isArray(savedPrefs)) {
        savedPrefs.forEach((pref) => {
          const key = `${pref.category}|${pref.subcategory}`;
          prefs[key] = pref.tipo_custo;
        });
      }

      setPreferences(prefs);
    } catch (err) {
      console.error('Erro ao carregar preferências:', err);
      // Se erro, usar valores padrão
      const prefs: PreferenceState = {};
      SUBCATEGORIES_CONFIG.forEach((config) => {
        const key = `${config.category}|${config.subcategory}`;
        prefs[key] = config.defaultTipo;
      });
      setPreferences(prefs);
    } finally {
      setLoading(false);
    }
  };

  const handleTipoChange = (category: string, subcategory: string, tipo: 'fixo' | 'variavel') => {
    const key = `${category}|${subcategory}`;
    setPreferences((prev) => ({
      ...prev,
      [key]: tipo,
    }));
    setSaveSuccess(false);
  };

  // Calcular tipo_categoria para cada categoria
  const getCategoryTipo = (category: string): 'hibrido' | 'normal' => {
    const subcats = groupedSubcategories[category] || [];
    const tipos = subcats.map((config) => {
      const key = `${config.category}|${config.subcategory}`;
      return preferences[key] || config.defaultTipo;
    });
    const hasFixo = tipos.includes('fixo');
    const hasVariavel = tipos.includes('variavel');
    return hasFixo && hasVariavel ? 'hibrido' : 'normal';
  };

  const savePreferences = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // Construir array de preferências para enviar
      const prefsToSave: PreferenceItem[] = SUBCATEGORIES_CONFIG.map((config) => {
        const key = `${config.category}|${config.subcategory}`;
        const tipo = preferences[key] || config.defaultTipo;
        const tipoCategoria = getCategoryTipo(config.category);

        return {
          category: config.category,
          subcategory: config.subcategory,
          tipo_custo: tipo,
          tipo_categoria: tipoCategoria,
        };
      });

      await preferencesApi.saveAll(prefsToSave);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar preferências:', err);
      setError('Erro ao salvar preferências. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Preferências</h1>
        </div>
        <p className="text-gray-600">
          Configure se cada subcategoria de despesa é um <strong>custo fixo</strong> (recorrente) ou <strong>variável</strong> (esporádico).
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Como funciona:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Custo Fixo:</strong> Despesas recorrentes como mensalidades, assinaturas, planos de saúde</li>
              <li><strong>Custo Variável:</strong> Despesas que variam como compras, alimentação, lazer</li>
              <li><strong>Categoria Híbrida:</strong> Quando uma categoria tem subcategorias fixas E variáveis, ela aparecerá nas duas seções na página de Budgets</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-800">Preferências salvas com sucesso!</p>
        </div>
      )}

      {/* Categories List */}
      <div className="space-y-6">
        {Object.entries(groupedSubcategories).map(([category, subcategories]) => {
          // Determinar o status geral da categoria
          const tipos = subcategories.map((config) => {
            const key = `${config.category}|${config.subcategory}`;
            return preferences[key] || config.defaultTipo;
          });
          const hasFixo = tipos.includes('fixo');
          const hasVariavel = tipos.includes('variavel');
          const categoryStatus = hasFixo && hasVariavel ? 'Híbrido' : hasFixo ? 'Fixo' : 'Variável';
          const statusColor = hasFixo && hasVariavel ? 'bg-purple-100 text-purple-800' : hasFixo ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800';

          return (
            <div key={category} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Category Header */}
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">{category}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                  {categoryStatus}
                </span>
              </div>

              {/* Subcategories */}
              <div className="divide-y divide-gray-100">
                {subcategories.map((config) => {
                  const key = `${config.category}|${config.subcategory}`;
                  const currentTipo = preferences[key] || config.defaultTipo;

                  return (
                    <div key={key} className="px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <span className="text-xl sm:text-2xl flex-shrink-0">{config.icon}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{config.subcategory}</p>
                          <p className="text-xs sm:text-sm text-gray-500 truncate">{config.description}</p>
                        </div>
                      </div>

                      {/* Toggle Buttons */}
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleTipoChange(config.category, config.subcategory, 'fixo')}
                          className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                            currentTipo === 'fixo'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Fixo
                        </button>
                        <button
                          onClick={() => handleTipoChange(config.category, config.subcategory, 'variavel')}
                          className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                            currentTipo === 'variavel'
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <span className="hidden sm:inline">Variável</span>
                          <span className="sm:hidden">Var</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={savePreferences}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Salvar Preferências
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Preferences;
