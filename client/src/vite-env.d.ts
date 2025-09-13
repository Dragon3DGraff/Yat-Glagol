/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  // больше переменных среды по мере необходимости
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
