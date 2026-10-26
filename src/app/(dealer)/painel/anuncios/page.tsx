import { redirect } from 'next/navigation';

/**
 * Anúncios deixou de ser módulo de navegação — publicação vive no Estoque.
 * Mantém a rota para bookmarks e redireciona.
 */
export default function AnunciosRedirectPage() {
  redirect('/painel/estoque');
}
