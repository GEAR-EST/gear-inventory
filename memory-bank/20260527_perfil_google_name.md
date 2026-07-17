---
title: "Atualização de Trigger - Nome Dinâmico do Google OAuth"
date: "2026-05-27"
type: "fix"
---

# Diagnóstico

A criação de registros na tabela `Perfil` não ocorre no frontend, sendo processada no backend do Supabase através de uma Trigger associada ao evento `AFTER INSERT` na tabela `auth.users`.

# Solução

O script SQL abaixo atualiza a função responsável pela criação do perfil (normalmente `handle_new_user`), para extrair o `full_name` diretamente dos metadados da conta Google armazenados no payload de autenticação.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfis (id, nome)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Operador')
    -- NOTA: Adicione outras colunas aqui se sua tabela 'perfis' exigir (ex: email, funcao).
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Instruções de Execução:**
Rode este script no SQL Editor do painel do Supabase para aplicar a correção.
