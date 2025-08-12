describe('Node Interactions', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  describe('User Input Node', () => {
    it('should handle text input correctly', () => {
      cy.addNode('userInput')
      
      // Configure as text input
      cy.configureNode('node-1', {
        title: 'Text Input Test',
        description: 'Enter some text'
      })

      // Enter text
      cy.get('[data-testid="node-node-1"] input[type="text"]')
        .type('Hello World')

      // Execute node
      cy.executeNode('node-1')
      cy.waitForNodeCompletion('node-1')

      // Verify output
      cy.get('[data-testid="node-node-1"]').should('contain', 'Hello World')
    })

    it('should handle textarea input correctly', () => {
      cy.addNode('userInput')
      
      // Configure as textarea
      cy.configureNode('node-1', {
        title: 'Textarea Input Test',
        inputType: 'textarea'
      })

      // Enter multiline text
      const multilineText = 'Line 1\nLine 2\nLine 3'
      cy.get('[data-testid="node-node-1"] textarea')
        .type(multilineText)

      // Execute node
      cy.executeNode('node-1')
      cy.waitForNodeCompletion('node-1')

      // Verify output contains all lines
      cy.get('[data-testid="node-node-1"]').should('contain', 'Line 1')
      cy.get('[data-testid="node-node-1"]').should('contain', 'Line 2')
      cy.get('[data-testid="node-node-1"]').should('contain', 'Line 3')
    })

    it('should validate required fields', () => {
      cy.addNode('userInput')
      
      // Configure as required
      cy.configureNode('node-1', {
        title: 'Required Input',
        required: true
      })

      // Try to execute without input
      cy.executeNode('node-1')

      // Should show error
      cy.get('[data-testid="node-node-1"]').should('contain', 'required')
      cy.get('[data-testid="node-node-1"]').should('have.class', 'border-red-400')
    })
  })

  describe('Generate Node', () => {
    it('should display configuration correctly', () => {
      cy.addNode('generate')
      
      // Configure the node
      cy.configureNode('node-1', {
        title: 'Test Generator',
        roleDescription: 'You are a helpful assistant',
        model: 'gpt-3.5-turbo',
        temperature: 0.8,
        maxTokens: 500
      })

      // Verify configuration is displayed
      cy.get('[data-testid="node-node-1"]').should('contain', 'Test Generator')
      cy.get('[data-testid="node-node-1"]').should('contain', 'You are a helpful assistant')
      cy.get('[data-testid="node-node-1"]').should('contain', 'gpt-3.5-turbo')
      cy.get('[data-testid="node-node-1"]').should('contain', '0.8')
      cy.get('[data-testid="node-node-1"]').should('contain', '500')
    })

    it('should show loading state during execution', () => {
      cy.addNode('userInput')
      cy.addNode('generate')
      
      // Connect nodes
      cy.connectNodes('node-1', 'node-2')
      
      // Add input
      cy.get('[data-testid="node-node-1"] input')
        .type('Test input')
      
      // Execute user input first
      cy.executeNode('node-1')
      cy.waitForNodeCompletion('node-1')
      
      // Execute generate node
      cy.executeNode('node-2')
      
      // Should show loading state
      cy.get('[data-testid="node-node-2"]').should('contain', 'Generating content...')
      cy.get('[data-testid="node-node-2"] .animate-pulse').should('exist')
    })

    it('should handle API errors gracefully', () => {
      // Mock API to return error
      cy.intercept('POST', '**/api/generate', {
        statusCode: 500,
        body: { error: 'API Error' }
      }).as('generateError')

      cy.addNode('userInput')
      cy.addNode('generate')
      cy.connectNodes('node-1', 'node-2')
      
      // Add input and execute
      cy.get('[data-testid="node-node-1"] input').type('Test')
      cy.executeNode('node-1')
      cy.waitForNodeCompletion('node-1')
      
      cy.executeNode('node-2')
      
      // Wait for API call
      cy.wait('@generateError')
      
      // Should show error state
      cy.get('[data-testid="node-node-2"]').should('have.class', 'border-red-400')
      cy.get('[data-testid="node-node-2"]').should('contain', 'error')
    })
  })

  describe('Output Node', () => {
    it('should display results correctly', () => {
      cy.addNode('userInput')
      cy.addNode('output')
      cy.connectNodes('node-1', 'node-2')
      
      // Add input
      cy.get('[data-testid="node-node-1"] input').type('Test output')
      
      // Execute workflow
      cy.executeWorkflow()
      
      // Wait for completion
      cy.waitForNodeCompletion('node-1')
      cy.waitForNodeCompletion('node-2')
      
      // Verify output is displayed
      cy.get('[data-testid="node-node-2"]').should('contain', 'Test output')
    })

    it('should support copy functionality', () => {
      cy.addNode('userInput')
      cy.addNode('output')
      cy.connectNodes('node-1', 'node-2')
      
      // Configure output node to show copy button
      cy.configureNode('node-2', {
        showCopyButton: true
      })
      
      // Add input and execute
      cy.get('[data-testid="node-node-1"] input').type('Copy this text')
      cy.executeWorkflow()
      cy.waitForNodeCompletion('node-2')
      
      // Click copy button
      cy.get('[data-testid="node-node-2"] [title="Copy to clipboard"]').click()
      
      // Verify copy action (would need to check clipboard in real implementation)
      cy.get('[data-testid="copy-success"]').should('be.visible')
    })

    it('should support download functionality', () => {
      cy.addNode('userInput')
      cy.addNode('output')
      cy.connectNodes('node-1', 'node-2')
      
      // Configure output node to show download button
      cy.configureNode('node-2', {
        showDownloadButton: true
      })
      
      // Add input and execute
      cy.get('[data-testid="node-node-1"] input').type('Download this content')
      cy.executeWorkflow()
      cy.waitForNodeCompletion('node-2')
      
      // Click download button
      cy.get('[data-testid="node-node-2"] [title="Download as file"]').click()
      
      // Verify download was triggered
      cy.readFile('cypress/downloads/output.txt').should('contain', 'Download this content')
    })
  })

  describe('Add Assets Node', () => {
    it('should handle text input', () => {
      cy.addNode('addAssets')
      
      // Add text content
      cy.get('[data-testid="node-node-1"] textarea[placeholder*="text"]')
        .type('This is text asset content')
      
      // Execute node
      cy.executeNode('node-1')
      cy.waitForNodeCompletion('node-1')
      
      // Verify text is processed
      cy.get('[data-testid="node-node-1"]').should('contain', 'This is text asset content')
    })

    it('should handle file uploads', () => {
      cy.addNode('addAssets')
      
      // Upload a test file
      cy.get('[data-testid="node-node-1"] input[type="file"]')
        .selectFile('cypress/fixtures/test-file.txt')
      
      // Verify file is displayed
      cy.get('[data-testid="node-node-1"]').should('contain', 'test-file.txt')
      cy.get('[data-testid="node-node-1"]').should('contain', 'Uploaded Files (1)')
    })

    it('should validate file types', () => {
      cy.addNode('addAssets')
      
      // Try to upload invalid file type
      cy.get('[data-testid="node-node-1"] input[type="file"]')
        .selectFile('cypress/fixtures/invalid-file.exe', { force: true })
      
      // Should show error
      cy.get('[data-testid="node-node-1"]').should('contain', 'not allowed')
      cy.get('[data-testid="error-message"]').should('be.visible')
    })

    it('should validate file size', () => {
      cy.addNode('addAssets')
      
      // Create a large file and try to upload
      cy.writeFile('cypress/fixtures/large-file.txt', 'x'.repeat(10 * 1024 * 1024)) // 10MB
      
      cy.get('[data-testid="node-node-1"] input[type="file"]')
        .selectFile('cypress/fixtures/large-file.txt', { force: true })
      
      // Should show size error
      cy.get('[data-testid="node-node-1"]').should('contain', 'too large')
    })

    it('should support drag and drop', () => {
      cy.addNode('addAssets')
      
      // Simulate drag and drop
      cy.get('[data-testid="node-node-1"] [data-testid="dropzone"]')
        .selectFile('cypress/fixtures/test-file.txt', { action: 'drag-drop' })
      
      // Verify file was added
      cy.get('[data-testid="node-node-1"]').should('contain', 'test-file.txt')
    })
  })

  describe('Node Selection and Properties', () => {
    it('should select nodes when clicked', () => {
      cy.addNode('userInput')
      cy.addNode('generate')
      
      // Click on first node
      cy.get('[data-testid="node-node-1"]').click()
      
      // Should be selected
      cy.get('[data-testid="node-node-1"]').should('have.class', 'ring-2')
      
      // Properties panel should show node details
      cy.get('[data-testid="properties-panel"]').should('contain', 'userInput')
    })

    it('should update properties in real-time', () => {
      cy.addNode('userInput')
      
      // Select node
      cy.get('[data-testid="node-node-1"]').click()
      
      // Update title in properties panel
      cy.get('[data-testid="properties-panel"] input[placeholder*="title"]')
        .clear()
        .type('Updated Title')
      
      // Node should update immediately
      cy.get('[data-testid="node-node-1"]').should('contain', 'Updated Title')
    })

    it('should show connected variables', () => {
      cy.addNode('userInput')
      cy.addNode('generate')
      cy.connectNodes('node-1', 'node-2')
      
      // Select generate node
      cy.get('[data-testid="node-node-2"]').click()
      
      // Should show connected variables
      cy.get('[data-testid="node-node-2"]').should('contain', 'Used in this step')
      cy.get('[data-testid="node-node-2"]').should('contain', 'node-1')
    })
  })
})