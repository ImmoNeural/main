import { useEffect, useState } from 'react';
import { Settings, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { preferencesApi, PreferenceItem } from '../services/api';
import { useOnboarding } from '../hooks/useOnboarding';

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

  // Check if tutorial is active - skip API calls during tutorial
  const { showOnboarding } = useOnboarding();

  // Agrupar subcategorias por categoria
  const groupedSubcategories = SUBCATEGORIES_CONFIG.reduce((acc, config) => {
    if (!acc[config.category]) {
      acc[config.category] = [];
    }
    acc[config.category].push(config);
    return acc;
  }, {} as Record<string, SubcategoryConfig[]>);

  useEffect(() => {
    // Durante tutorial, pular chamadas de API e usar configurações padrão
    if (showOnboarding) {
      console.log('🎮 Preferences: Tutorial mode - using default preferences');
      // Usar valores padrão do config
      const defaultPrefs: PreferenceState = {};
      SUBCATEGORIES_CONFIG.forEach((config) => {
        const key = `${config.category}|${config.subcategory}`;
        defaultPrefs[key] = config.defaultTipo;
      });
      setPreferences(defaultPrefs);
      setLoading(false);
      return;
    }
    loadPreferences();
  }, [showOnboarding]);

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
        <div className="spinner w-12 h-12"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto" data-tour="preferences-page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header__titles">
          <span className="icon-chip-lg bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
            <Settings className="w-6 h-6" />
          </span>
          <div className="min-w-0">
            <h1 className="page-title">Preferências</h1>
            <p className="page-subtitle">
              Configure se cada subcategoria de despesa é um <strong>custo fixo</strong> (recorrente) ou <strong>variável</strong> (esporádico).
            </p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="info-card mb-6">
        <AlertCircle className="w-5 h-5 text-primary-600 dark:text-primary-300 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold mb-1 text-slate-900 dark:text-white">Como funciona:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Custo Fixo:</strong> Despesas recorrentes como mensalidades, assinaturas, planos de saúde</li>
            <li><strong>Custo Variável:</strong> Despesas que variam como compras, alimentação, lazer</li>
            <li><strong>Categoria Híbrida:</strong> Quando uma categoria tem subcategorias fixas E variáveis, ela aparecerá nas duas seções na página de Budgets</li>
          </ul>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card p-4 mb-6 flex items-center gap-3 border-red-200 dark:border-red-900/40">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {saveSuccess && (
        <div className="card p-4 mb-6 flex items-center gap-3 border-accent-200 dark:border-accent-900/40">
          <CheckCircle className="w-5 h-5 text-accent-600 dark:text-accent-400 flex-shrink-0" />
          <p className="text-accent-600 dark:text-accent-400">Preferências salvas com sucesso!</p>
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
          const statusBadge = hasFixo && hasVariavel ? 'badge-warning' : hasFixo ? 'badge-primary' : 'badge-success';

          return (
            <div key={category} className="card overflow-hidden p-0">
              {/* Category Header */}
              <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h2 className="card-title">{category}</h2>
                <span className={`badge ${statusBadge}`}>
                  {categoryStatus}
                </span>
              </div>

              {/* Subcategories */}
              <div className="list-divider px-3 sm:px-4">
                {subcategories.map((config) => {
                  const key = `${config.category}|${config.subcategory}`;
                  const currentTipo = preferences[key] || config.defaultTipo;

                  return (
                    <div key={key} className="py-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <span className="icon-chip bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-lg sm:text-xl">{config.icon}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white text-sm sm:text-base truncate">{config.subcategory}</p>
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">{config.description}</p>
                        </div>
                      </div>

                      {/* Toggle Buttons */}
                      <div className="segmented flex-shrink-0">
                        <button
                          onClick={() => handleTipoChange(config.category, config.subcategory, 'fixo')}
                          className={`seg-btn ${currentTipo === 'fixo' ? 'seg-btn-active is-primary' : ''}`}
                        >
                          Fixo
                        </button>
                        <button
                          onClick={() => handleTipoChange(config.category, config.subcategory, 'variavel')}
                          className={`seg-btn ${currentTipo === 'variavel' ? 'seg-btn-active is-accent' : ''}`}
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
          className="btn-primary"
        >
          {saving ? (
            <>
              <div className="spinner w-5 h-5 border-white/40 border-t-white"></div>
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
