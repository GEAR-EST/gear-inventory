import { describe, test, expect } from "vitest";
import { parseQrCodeString } from "./qrParser";

describe("parseQrCodeString", () => {
  test("deve detectar e normalizar um UUID v4 de Área", () => {
    const uuid = "4f84fa2d-7649-4eb0-a541-e8d7bb686a7d";
    const result = parseQrCodeString(uuid);
    expect(result.searchField).toBe("id");
    expect(result.value).toBe(uuid);
  });

  test("deve detectar UUID v4 mesmo com letras maiúsculas", () => {
    const uuid = "4F84FA2D-7649-4EB0-A541-E8D7BB686A7D";
    const result = parseQrCodeString(uuid);
    expect(result.searchField).toBe("id");
    expect(result.value).toBe(uuid.toLowerCase());
  });

  test("deve decodificar e normalizar uma URL com protocolo https", () => {
    const url = "https://me-qr.com/xyz123";
    const result = parseQrCodeString(url);
    expect(result.searchField).toBe("qr_url");
    expect(result.value).toBe("https://me-qr.com/xyz123");
  });

  test("deve decodificar e normalizar URL removendo query parameters", () => {
    const url = "https://me-qr.com/xyz123?utm_source=test&foo=bar";
    const result = parseQrCodeString(url);
    expect(result.searchField).toBe("qr_url");
    expect(result.value).toBe("https://me-qr.com/xyz123");
  });

  test("deve tratar strings alfanuméricas customizadas como fallback de qr_url", () => {
    const customCode = "AREA-A1-PRATELEIRA3";
    const result = parseQrCodeString(customCode);
    expect(result.searchField).toBe("qr_url");
    expect(result.value).toBe(customCode);
  });

  test("deve tratar string vazia sem estourar exceção", () => {
    const result = parseQrCodeString("");
    expect(result.searchField).toBe("qr_url");
    expect(result.value).toBe("");
  });
});
