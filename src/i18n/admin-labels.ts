import type { EmDashManifest } from 'emdash/astro';

// These are presentation labels for our schema, separate from EmDash's own catalogs.
const kitchenRecipeLabels = {
  en: {
    title: 'Title', description: 'Short description',
    ingredients: 'Ingredients — one ingredient and quantity per line',
    steps: 'Preparation — one step per line, in order',
    prep_minutes: 'Preparation time (minutes, shared)', cook_minutes: 'Cooking time (minutes, shared)',
    servings: 'Servings (shared)', rating: 'Personal rating out of 5 (optional, shared)',
    notes: 'Personal review / cooking notes', last_cooked: 'Last cooked (optional, shared)',
    source_url: 'Source URL (optional, shared)', cover_image: 'Cover photo — 1 of 3 (shared)',
    photo_2: 'Gallery photo — 2 of 3 (shared)', photo_3: 'Gallery photo — 3 of 3 (shared)',
    is_example: 'Fictional example — display a notice (shared)',
  },
  fr: {
    title: 'Titre', description: 'Courte description',
    ingredients: 'Ingrédients — un ingrédient et sa quantité par ligne',
    steps: 'Préparation — une étape par ligne, dans l’ordre',
    prep_minutes: 'Temps de préparation (minutes, partagé)', cook_minutes: 'Temps de cuisson (minutes, partagé)',
    servings: 'Nombre de portions (partagé)', rating: 'Note personnelle sur 5 (facultative, partagée)',
    notes: 'Avis personnel / notes de cuisine', last_cooked: 'Dernière préparation (facultative, partagée)',
    source_url: 'Lien vers la source (facultatif, partagé)', cover_image: 'Photo de couverture — 1 sur 3 (partagée)',
    photo_2: 'Photo de la galerie — 2 sur 3 (partagée)', photo_3: 'Photo de la galerie — 3 sur 3 (partagée)',
    is_example: 'Exemple fictif — afficher une mention (partagé)',
  },
  'pt-BR': {
    title: 'Título', description: 'Descrição breve',
    ingredients: 'Ingredientes — um ingrediente e sua quantidade por linha',
    steps: 'Preparo — uma etapa por linha, na ordem',
    prep_minutes: 'Tempo de preparo (minutos, compartilhado)', cook_minutes: 'Tempo de cozimento (minutos, compartilhado)',
    servings: 'Número de porções (compartilhado)', rating: 'Nota pessoal de 1 a 5 (opcional, compartilhada)',
    notes: 'Avaliação pessoal / anotações de cozinha', last_cooked: 'Último preparo (opcional, compartilhado)',
    source_url: 'Link da fonte (opcional, compartilhado)', cover_image: 'Foto de capa — 1 de 3 (compartilhada)',
    photo_2: 'Foto da galeria — 2 de 3 (compartilhada)', photo_3: 'Foto da galeria — 3 de 3 (compartilhada)',
    is_example: 'Exemplo fictício — mostrar um aviso (compartilhado)',
  },
};

/** Localize only our known display labels. Keep the cached manifest and schema untouched. */
export function localizeRecipeManifest(manifest: EmDashManifest, locale: string): EmDashManifest {
  if (locale !== 'fr' && locale !== 'pt-BR') return manifest;
  const recipe = manifest.collections.recipes;
  if (!recipe) return manifest;
  const fields = Object.fromEntries(Object.entries(recipe.fields).map(([slug, field]) => {
    const key = slug as keyof typeof kitchenRecipeLabels.en;
    // Preserve labels customized by an administrator, and any future unknown fields.
    const label = Object.hasOwn(kitchenRecipeLabels.en, key) && field.label === kitchenRecipeLabels.en[key]
      ? kitchenRecipeLabels[locale][key] : field.label;
    return [slug, label === field.label ? field : { ...field, label }];
  }));
  return { ...manifest, collections: { ...manifest.collections, recipes: {
    ...recipe,
    label: recipe.label === 'Recipes' ? (locale === 'fr' ? 'Recettes' : 'Receitas') : recipe.label,
    labelSingular: recipe.labelSingular === 'Recipe' ? (locale === 'fr' ? 'Recette' : 'Receita') : recipe.labelSingular,
    fields,
  } } };
}
