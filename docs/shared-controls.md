# Shared interactive controls

Import the small Vue components from `src/components/ui`. They use the semantic tokens and system-following appearance described in [interface foundations](interface-foundations.md); no theme prop or motion is needed. All actions need meaningful visible text. These are controls, not a status/feedback component library.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiLink from '@/components/ui/UiLink.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import UiDialog from '@/components/ui/UiDialog.vue'

const title = ref('')
const sort = ref('new')
</script>

<template>
  <UiButton type="submit">Save details</UiButton>
  <UiButton variant="secondary" disabled>Save unavailable</UiButton>
  <UiLink href="/">Back to Archive</UiLink>
  <UiLink href="/" disabled>Archive unavailable</UiLink>
  <UiInput
    v-model="title"
    label="Title"
    name="title"
    hint="Use a descriptive title"
    :error="title ? undefined : 'Enter a title'"
  />
  <UiSelect v-model="sort" label="Sort by" name="sort">
    <option value="new">Newest</option>
    <option value="old">Oldest</option>
  </UiSelect>
  <UiDialog trigger="Show details" title="Details" description="More about this item.">
    <p>Additional details go here.</p>
  </UiDialog>
</template>
```

Buttons default to `type="button"`; explicitly choose `submit` in forms. Primary and secondary buttons have a 3rem minimum height and wrap long labels. Native `disabled` prevents activation. Links use ordinary `href` navigation; a disabled link renders non-focusable text without an `href` or click handlers. Prefer explaining why an action is unavailable nearby. For router navigation, use the router's native link API rather than passing a route object here.

Inputs and selects accept `label`, optional `id`, `hint` and `error`, and string `v-model`. IDs are generated per instance unless supplied; explicit IDs must be unique. Additional attributes (such as `name`, `required`, `disabled`, `type`, and `aria-describedby`) go to the native control. Existing descriptions are retained alongside hint and error IDs. An error adds `aria-invalid`, a dashed border, and visible “Error:” text; callers decide when validation appears and should focus the invalid field or announce a form-level summary after submission. Native select options are supplied through its default slot.

Dialog trigger, title, and description are required text props; the default slot contains its content and `closeLabel` changes the visible close action. Reka provides modal focus containment, Escape dismissal and trigger focus return. Do not place another dialog trigger inside the trigger text. Keep dialog content short enough to navigate; long content scrolls within the dialog.

## State examples and verification

The example shows default and disabled actions, plus input validation. Hover adds an underline or thickens a link underline; keyboard focus has an offset outline. Disabled buttons use dashed borders and struck-through text; disabled links are struck through. Validation has text and a dashed border, not color alone. Fields and controls use the same semantic colors in both themes. No component introduces animation, so reduced-motion users are not exposed to nonessential motion.

Run `vp test src/components/ui/__tests__/controls.spec.ts` for component coverage. The development-only fixture at `/scripts/fixtures/controls.html` is not a production route or catalog. Reproduce the Chrome browser checks from the repository root:

```sh
vp dev --host 127.0.0.1 --port 5174 --strictPort
# In another terminal:
vp node scripts/verify-controls.mjs
```

Set `CHROME_PATH` to use a different Chrome executable or `CONTROLS_URL` to use a different dev-server origin. The script writes [screenshots and computed evidence](controls/verification.json). Chrome 157 passed native select typeahead, button Enter, disabled activation, dialog Tab/Shift+Tab wrapping through both slot controls, Escape and trigger return. It also checked input and select borders in default/error/disabled states, enabled and disabled field hover, keyboard focus, minimum button height, and reduced-motion emulation in both themes. These checks do not establish narrow-layout or full cross-screen acceptance, which remains integration work.
