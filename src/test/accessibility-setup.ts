import { configureAxe } from 'vitest-axe'

// Configure axe for accessibility testing
configureAxe({
  rules: {
    // Disable color-contrast rule for testing as it can be flaky
    'color-contrast': { enabled: false },
    // Focus on critical accessibility issues
    'aria-allowed-attr': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'button-name': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'frame-title': { enabled: true },
    'image-alt': { enabled: true },
    'input-button-name': { enabled: true },
    'input-image-alt': { enabled: true },
    'label': { enabled: true },
    'link-name': { enabled: true },
    'object-alt': { enabled: true },
    'role-img-alt': { enabled: true },
    'td-headers-attr': { enabled: true },
    'th-has-data-cells': { enabled: true },
    'valid-lang': { enabled: true },
    'video-caption': { enabled: true },
  }
})