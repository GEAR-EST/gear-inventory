export interface DecodedTarget {
  searchField: "id" | "qr_url";
  value: string;
}

/**
 * Analisa o texto escaneado da câmera e decide se busca por ID único (UUID) ou URL de área normalizada.
 */
export function parseQrCodeString(rawText: string): DecodedTarget {
  if (!rawText) {
    return {
      searchField: "qr_url",
      value: "",
    };
  }

  const trimmed = rawText.trim();

  // Expressão regular para validar formato UUID v4
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(trimmed)) {
    return {
      searchField: "id",
      value: trimmed.toLowerCase(),
    };
  }

  // Verifica se é uma URL (externa ou interna)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      // Remove parâmetros de consulta adicionais para normalização
      const normalizedUrl = `${url.protocol}//${url.hostname}${url.pathname}`;
      return {
        searchField: "qr_url",
        value: normalizedUrl,
      };
    } catch {
      return {
        searchField: "qr_url",
        value: trimmed,
      };
    }
  }

  // Fallback para códigos de áreas customizados (ex: AREA-A1)
  return {
    searchField: "qr_url",
    value: trimmed,
  };
}
