# Carla's recipe notebook

The developer gives you the notebook address and an invitation link. You only need a browser. You never need Git, a terminal, Netlify or Turso.

## Sign in and keep a backup way in

1. Open the invitation on the device you want to use. Create your account and save a passkey when your browser asks. Use the same notebook address on every visit.
2. Open the notebook's **Manage recipes** link and sign in with your passkey. Your phone may ask for a fingerprint, face recognition or device PIN.
3. In account settings, add a **second passkey on an independent device or security key**. Test it before relying on it. A second name for the same synced credential is not an independent recovery method.
4. Do not rely on email login: this POC has no email delivery service. If you lose all passkeys, contact the developer. There is no working emailed recovery link unless the developer later configures and tests email.

The administration can be shown in English, French or **Português (Brasil)** using its language control. The recipe menu and form labels follow this choice: **Recipes / Recipe**, **Recettes / Recette**, or **Receitas / Receita**. The recipe language is a separate setting; choose Brazilian Portuguese (`pt-BR`) for Carla's Portuguese recipes. Native EmDash screens may still contain untranslated upstream interface strings. “Editor” lets you manage recipes, photos and categories, but not infrastructure or CMS-wide settings.

## Add a recipe

1. Open **Recipes**, then **New Recipe**. Enter the title and a short description.
2. Enter one ingredient with its quantity per line. Enter one preparation step per line, in the right order; the public page adds the numbers.
3. Fill in preparation/cooking minutes and servings. Optionally add your own rating (1–5), cooking notes, last-cooked date and original source link.
4. Choose up to **three photos**: cover, gallery photo 2 and gallery photo 3. Open a photo field to choose an existing photo or upload from your device. The same media library is available from the sidebar.
5. Supported photos are JPEG, PNG and WebP. Large supported photos are reduced in the browser before upload. Keep the tab open while uploading. If a photo cannot be opened, select a supported photo; HEIC and video are not supported in this POC.
6. Use the media editor to enter useful alt text, such as “Roasted tomatoes on two slices of toast”. Reuse existing photos rather than uploading them again for another language.
7. Save. Open **Settings** to check the URL slug, recipe language and categories. To add a category, open its chooser, type the new name in the search field, then choose **Create**. Native category assignments save immediately, separately from text publication. Your saved text draft stays private.

## Add another language

1. Save the source recipe, open **Settings**, and find its **Translations** section. Publish the source first if you want a new translation to inherit its latest shared photos and numbers; unpublished changes remain in its draft revision.
2. Choose the missing language to create a linked translation. Enter that language's title, description, ingredients, preparation and notes; check its independent URL slug.
3. Times, servings, personal rating, date, source and the three photo fields are shared. Saving keeps changes in a draft; publishing propagates shared values to linked entries. Avoid changing those same values in several language drafts at once.
4. Use translated category labels. The language switcher only shows a recipe link after that translation is published.
5. Save and publish each translation separately. If you are not ready, leave it in draft. An unavailable translation is clearly marked on the public site; it is never invented or translated automatically.

## Publish and check

Use **Publish now** for immediate publication. Do not use scheduled publishing in this POC. Reload the public recipe on your phone; the result should appear without a developer, Git change or manual redeployment. Verify the photos, ingredients, steps, category and language links.

The supplied recipes are explicitly marked fictional examples; their ratings and notes are not yours. Create your own recipe with the fictional-example switch off. You can leave a recipe without photos or a personal rating.

If saving/uploading reports that the service is unavailable, keep your text in the editor, wait briefly and retry. Do not repeatedly tap Publish or Upload. Contact the developer if it persists. The Free hosting plan can pause when its monthly usage budget is exhausted.

## Tags

In a recipe's Settings, use Tags / Étiquettes / Etiquetas for details such as ingredients or cooking methods. Create terms from the chooser, as for categories, and provide their translations in Taxonomies. Tags appear with a small tag icon on recipe cards and recipe pages. Clicking one opens the notebook filtered by that tag. The tag filter can be combined with category and title search; “All tags” removes only the tag filter. Terms without a translation in the selected language are not displayed there.
