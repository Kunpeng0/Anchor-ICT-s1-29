export const LLM_MODEL_STORAGE_KEY = 'anchor-llm-model'

export const LLM_MODELS = [
  {
    value: 'phi3:mini',
    label: 'Phi-3 Mini',
    description: 'Faster local default for everyday chart queries.',
  },
  {
    value: 'gemma3:4b',
    label: 'Gemma 3 4B',
    description: 'Stronger model for heavier local analysis.',
  },
] as const

export type LlmModel = (typeof LLM_MODELS)[number]['value']

export const DEFAULT_LLM_MODEL: LlmModel = 'phi3:mini'

export function isLlmModel(value: string | null): value is LlmModel {
  return LLM_MODELS.some((model) => model.value === value)
}

export function getStoredLlmModel(): LlmModel {
  const storedModel = window.localStorage.getItem(LLM_MODEL_STORAGE_KEY)
  return isLlmModel(storedModel) ? storedModel : DEFAULT_LLM_MODEL
}

export function getLlmModelLabel(value: LlmModel): string {
  return LLM_MODELS.find((model) => model.value === value)?.label || value
}
