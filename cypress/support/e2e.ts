// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests from command log
Cypress.on('window:before:load', (win) => {
  // Stub console methods to reduce noise in tests
  cy.stub(win.console, 'log')
  cy.stub(win.console, 'warn')
  cy.stub(win.console, 'error')
})

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // on uncaught exceptions that we expect (like network errors)
  if (err.message.includes('Network Error') || 
      err.message.includes('Failed to fetch') ||
      err.message.includes('ResizeObserver')) {
    return false
  }
  return true
})