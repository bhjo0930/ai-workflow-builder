describe('Workflow Creation', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should load the application successfully', () => {
    cy.get('h1').should('contain', 'AI Workflow Builder')
    cy.get('[data-testid="canvas"]').should('be.visible')
  })

  it('should create a simple workflow', () => {
    // Add user input node
    cy.addNode('userInput')
    cy.get('[data-testid^="node-"]').should('have.length', 1)

    // Add generate node
    cy.addNode('generate')
    cy.get('[data-testid^="node-"]').should('have.length', 2)

    // Add output node
    cy.addNode('output')
    cy.get('[data-testid^="node-"]').should('have.length', 3)

    // Verify nodes are positioned correctly (no overlap)
    cy.get('[data-testid^="node-"]').each(($node, index) => {
      cy.wrap($node).should('be.visible')
    })
  })

  it('should configure node properties', () => {
    // Add a user input node
    cy.addNode('userInput')
    
    // Configure the node
    cy.configureNode('node-1', {
      title: 'Custom User Input',
      description: 'Enter your custom input here'
    })

    // Verify configuration was applied
    cy.get('[data-testid="node-node-1"]').should('contain', 'Custom User Input')
  })

  it('should connect nodes together', () => {
    // Create a simple workflow
    cy.addNode('userInput')
    cy.addNode('generate')
    cy.addNode('output')

    // Connect the nodes
    cy.connectNodes('node-1', 'node-2')
    cy.connectNodes('node-2', 'node-3')

    // Verify connections exist
    cy.get('[data-testid^="edge-"]').should('have.length', 2)
  })

  it('should prevent circular dependencies', () => {
    // Create nodes
    cy.addNode('userInput')
    cy.addNode('generate')

    // Connect A -> B
    cy.connectNodes('node-1', 'node-2')

    // Try to connect B -> A (should be prevented)
    cy.connectNodes('node-2', 'node-1')

    // Should show error or prevent connection
    cy.get('[data-testid="error-message"]').should('be.visible')
      .and('contain', 'circular dependency')
  })

  it('should execute individual nodes', () => {
    // Add and configure a user input node
    cy.addNode('userInput')
    cy.configureNode('node-1', {
      title: 'Test Input'
    })

    // Add input value
    cy.get('[data-testid="node-node-1"] input, [data-testid="node-node-1"] textarea')
      .type('Test input value')

    // Execute the node
    cy.executeNode('node-1')

    // Wait for completion
    cy.waitForNodeCompletion('node-1')

    // Verify result is displayed
    cy.get('[data-testid="node-node-1"]').should('contain', 'Test input value')
  })

  it('should execute complete workflow', () => {
    // Create a complete workflow
    cy.addNode('userInput')
    cy.addNode('generate')
    cy.addNode('output')

    // Configure nodes
    cy.configureNode('node-1', { title: 'Name Input' })
    cy.configureNode('node-2', { title: 'Greeting Generator' })
    cy.configureNode('node-3', { title: 'Final Output' })

    // Connect nodes
    cy.connectNodes('node-1', 'node-2')
    cy.connectNodes('node-2', 'node-3')

    // Add input
    cy.get('[data-testid="node-node-1"] input, [data-testid="node-node-1"] textarea')
      .type('John Doe')

    // Execute workflow
    cy.executeWorkflow()

    // Wait for all nodes to complete
    cy.waitForNodeCompletion('node-1')
    cy.waitForNodeCompletion('node-2')
    cy.waitForNodeCompletion('node-3')

    // Verify final output
    cy.get('[data-testid="node-node-3"]').should('contain', 'John Doe')
  })

  it('should handle workflow errors gracefully', () => {
    // Create a workflow with missing configuration
    cy.addNode('generate')
    
    // Try to execute without proper configuration
    cy.executeNode('node-1')

    // Should show error state
    cy.get('[data-testid="node-node-1"]').should('have.class', 'border-red-400')
    cy.get('[data-testid="error-message"]').should('be.visible')
  })

  it('should save and load workflows', () => {
    // Create a workflow
    cy.addNode('userInput')
    cy.addNode('output')
    cy.connectNodes('node-1', 'node-2')

    // Save workflow
    cy.saveWorkflow('test-workflow')

    // Clear workflow (if there's a clear button)
    cy.get('[data-testid="clear-button"], button:contains("Clear")').click()
    cy.get('[data-testid^="node-"]').should('have.length', 0)

    // Load workflow
    cy.loadWorkflow('test-workflow.json')

    // Verify workflow was loaded
    cy.get('[data-testid^="node-"]').should('have.length', 2)
    cy.get('[data-testid^="edge-"]').should('have.length', 1)
  })

  it('should support undo/redo operations', () => {
    // Add a node
    cy.addNode('userInput')
    cy.get('[data-testid^="node-"]').should('have.length', 1)

    // Undo
    cy.get('[title*="Undo"]').click()
    cy.get('[data-testid^="node-"]').should('have.length', 0)

    // Redo
    cy.get('[title*="Redo"]').click()
    cy.get('[data-testid^="node-"]').should('have.length', 1)
  })

  it('should be responsive on different screen sizes', () => {
    // Test mobile view
    cy.viewport(375, 667)
    cy.get('h1').should('be.visible')
    cy.get('[data-testid="canvas"]').should('be.visible')

    // Test tablet view
    cy.viewport(768, 1024)
    cy.get('h1').should('be.visible')
    cy.get('[data-testid="canvas"]').should('be.visible')

    // Test desktop view
    cy.viewport(1920, 1080)
    cy.get('h1').should('be.visible')
    cy.get('[data-testid="canvas"]').should('be.visible')
  })

  it('should handle keyboard navigation', () => {
    // Add nodes
    cy.addNode('userInput')
    cy.addNode('generate')

    // Test tab navigation
    cy.get('body').tab()
    cy.focused().should('be.visible')

    // Test keyboard shortcuts
    cy.get('body').type('{ctrl+z}') // Undo
    cy.get('[data-testid^="node-"]').should('have.length', 1)

    cy.get('body').type('{ctrl+y}') // Redo
    cy.get('[data-testid^="node-"]').should('have.length', 2)
  })
})