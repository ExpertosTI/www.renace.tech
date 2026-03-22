/** @odoo-module **/
/**
 * RENACE SSO — Clipboard copy helper
 * Adds a "Copy" button next to the SSO link field in the wizard.
 */
import { patch } from '@web/core/utils/patch';
import { CharField } from '@web/views/fields/char/char_field';

// Small utility: notify user of copy success
function flashMessage(el, text) {
    const old = el.textContent;
    el.textContent = text;
    el.classList.add('text-success');
    setTimeout(() => {
        el.textContent = old;
        el.classList.remove('text-success');
    }, 2000);
}

// Patch CharField to auto-select and add copy button on field named sso_link
patch(CharField.prototype, {
    setup() {
        super.setup(...arguments);
    },

    get ssoLinkMode() {
        return this.props.name === 'sso_link';
    },
});
