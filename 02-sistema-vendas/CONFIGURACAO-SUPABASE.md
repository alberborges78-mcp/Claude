# Configuração do sistema no Supabase e Vercel

## 1. Criar o banco

1. Crie um projeto em https://supabase.com.
2. Abra **SQL Editor** no painel do projeto.
3. Copie todo o conteúdo de `supabase.sql`, cole no editor e execute.

## 2. Criar seu usuário

1. No Supabase, abra **Authentication > Users**.
2. Clique em **Add user > Create new user**.
3. Informe o e-mail e a senha que você usará para entrar no sistema.
4. Em **Authentication > Providers > Email**, desative novos cadastros públicos se apenas você utilizará o sistema.

## 3. Conectar o site ao banco

1. Abra **Project Settings > API** no Supabase.
2. Copie a **Project URL**.
3. Copie a chave pública **anon / publishable**.
4. Abra `config.js` e substitua os dois textos de exemplo.

Exemplo:

```js
window.APP_CONFIG = {
  supabaseUrl: "https://seu-projeto.supabase.co",
  supabaseAnonKey: "sua-chave-publica"
};
```

Nunca use a chave `service_role` no site.

## 4. Testar

Mantenha estes arquivos na mesma pasta:

- `index.html`
- `style.css`
- `script.js`
- `config.js`

Abra por um servidor local ou publique na Vercel. Entre com o usuário criado no Supabase. O indicador no topo deverá mostrar **Dados salvos**.

## 5. Publicar na Vercel

1. Acesse https://vercel.com e crie um novo projeto.
2. Envie a pasta com os quatro arquivos do sistema.
3. Se solicitado, selecione **Other** como framework.
4. Não informe comando de build; este é um site estático.
5. Após publicar, abra o endereço fornecido pela Vercel e faça login.

## Como os dados são protegidos

A tabela usa Row Level Security (RLS). Cada usuário autenticado só consegue ler e alterar o registro vinculado ao próprio identificador. A chave pública do Supabase pode ficar no navegador; a segurança depende do login e das políticas criadas por `supabase.sql`.
