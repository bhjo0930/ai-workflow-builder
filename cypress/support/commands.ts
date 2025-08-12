/// <reference types="cypress" />

// Custom commands for workflow testing
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Add a node to the workflow
       * @param nodeType - Type of node to add
       * @example cy.addNode('userInput')
       */
      addNode(nodeType: 'userInput' | 'generate' | 'output' | 'addAssets'): Chainable<Element>
      
      /**
       * Connect two nodes
       * @param sourceNodeId - ID of source node
       * @param targetNodeId - ID of target node
       * @example cy.connectNodes('node-1', 'node-2')
       */
      connectNodes(sourceNodeId: string, targetNodeId: string): Chainable<Element>
      
      /**
       * Execute a single node
       * @param nodeId - ID of node to execute
       * @example cy.executeNode('node-1')
       */
      executeNode(nodeId: string): Chainable<Element>
      
      /**
       * Execute the entire workflow
       * @example cy.executeWorkflow()
       */
      executeWorkflow(): Chainable<Element>
      
      /**
       * Wait for node to complete execution
       * @param nodeId - ID of node to wait for
       * @example cy.waitForNodeCompletion('node-1')
       */
      waitForNodeCompletion(nodeId: string): Chainable<Element>
      
      /**
       * Configure a node
       * @param nodeId - ID of node to configure
       * @param config - Configuration object
       * @example cy.configureNode('node-1', { title: 'New Title' })
       */
      configureNode(nodeId: string, config: Record<string, any>): Chainable<Element>
      
      /**
       * Save workflow
       * @param filename - Optional filename
       * @example cy.saveWorkflow('my-workflow')
       */
      saveWorkflow(filename?: string): Chainable<Element>
      
      /**
       * Load workflow
       * @param filename - Filename to load
       * @example cy.loadWorkflow('test-workflow.json')
       */
      loadWorkflow(filename: string): Chainable<Element>
    }
  }
}

// Add node command
Cypress.Commands.add('addNode', (nodeType: string) => {
  const buttonTitles = {
    userInput: 'Collect input from user',
    generate: 'Generate content with LLM',
    output: 'Display final results',
    addAssets: 'Add files or text assets'
  }
  
  return cy.get(`[title="${buttonTitles[nodeType as keyof typeof buttonTitles]}"]`).click()
})

// Connect nodes command
Cypress.Commands.add('connectNodes', (sourceNodeId: string, targetNodeId: string) => {
  // This would need to be implemented based on how React Flow handles connections
  // For now, we'll simulate the drag and drop operation
  cy.get(`[data-testid="node-${sourceNodeId}"] [data-testid="handle"][type="source"]`)
    .trigger('mousedown', { button: 0 })
  
  cy.get(`[data-testid="node-${targetNodeId}"] [data-testid="handle"][type="target"]`)
    .trigger('mousemove')
    .trigger('mouseup')
    
  return cy.get(`[data-testid="edge-${sourceNodeId}-${targetNodeId}"]`)
})

// Execute node command
Cypress.Commands.add('executeNode', (nodeId: string) => {
  return cy.get(`[data-testid="node-${nodeId}"] [title="Execute node"]`).click()
})

// Execute workflow command
Cypress.Commands.add('executeWorkflow', () => {
  return cy.get('[title="Execute entire workflow"]').click()
})

// Wait for node completion
Cypress.Commands.add('waitForNodeCompletion', (nodeId: string) => {
  return cy.get(`[data-testid="node-${nodeId}"]`)
    .should('not.have.class', 'border-blue-400') // Not running
    .should('have.class', 'border-green-500') // Completed
})

// Configure node command
Cypress.Commands.add('configureNode', (nodeId: string, config: Record<string, any>) => {
  // Click on node to select it
  cy.get(`[data-testid="node-${nodeId}"]`).click()
  
  // Configure based on config object
  Object.entries(config).forEach(([key, value]) => {
    if (key === 'title') {
      cy.get('[data-testid="properties-panel"] input[placeholder*="title"], [data-testid="properties-panel"] input[value*="title"]')
        .clear()
        .type(value)
    } else if (key === 'description') {
      cy.get('[data-testid="properties-panel"] textarea[placeholder*="description"], [data-testid="properties-panel"] textarea')
        .first()
        .clear()
        .type(value)
    }
    // Add more configuration options as needed
  })
  
  return cy.get(`[data-testid="node-${nodeId}"]`)
})

// Save workflow command
Cypress.Commands.add('saveWorkflow', (filename?: string) => {
  cy.get('[data-testid="save-button"], button:contains("Save")').click()
  
  if (filename) {
    cy.get('input[placeholder*="filename"], input[type="text"]').type(filename)
    cy.get('button:contains("Save"), button:contains("Download")').click()
  }
  
  return cy.get('body') // Return something chainable
})

// Load workflow command
Cypress.Commands.add('loadWorkflow', (filename: string) => {
  cy.get('[data-testid="load-button"], button:contains("Load")').click()
  cy.get('input[type="file"]').selectFile(`cypress/fixtures/${filename}`)
  
  return cy.get('body') // Return something chainable
})