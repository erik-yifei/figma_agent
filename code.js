// Show the plugin UI
figma.showUI(__html__, { width: 340, height: 420 });

// Listen for messages from the UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'create-post') {
    try {
      // Get data from message
      const { headline, body, templateType } = msg;
      
      // Define template names based on type
      const headlineTemplateName = templateType === 'breaking' ? 'Breaking News Template' : 'Non Breaking News Template';
      const bodyTemplateName = 'News Body Template';
      
      // Load fonts first to avoid errors
      await figma.loadFontAsync({ family: "ITC Cheltenham Std", style: "Book" });
      await figma.loadFontAsync({ family: "SF Pro Display", style: "Semibold" });
      
      // Find templates
      const headlineTemplate = figma.currentPage.findOne(n => n.name === headlineTemplateName);
      const bodyTemplate = figma.currentPage.findOne(n => n.name === bodyTemplateName);
      
      if (!headlineTemplate) {
        figma.notify(`Could not find ${headlineTemplateName}`, { error: true });
        return;
      }
      
      if (!bodyTemplate) {
        figma.notify(`Could not find ${bodyTemplateName}`, { error: true });
        return;
      }
      
      // Create post components
      const headlinePost = headlineTemplate.clone();
      const bodyPost = bodyTemplate.clone();
      
      // Find Posts frame or create it
      let postsFrame = figma.currentPage.findOne(n => n.name === 'Posts');
      if (!postsFrame) {
        postsFrame = figma.createFrame();
        postsFrame.name = 'Posts';
        postsFrame.resize(1000, 500);
      }
      
      // Create group frame
      const group = figma.createFrame();
      group.name = `${templateType === 'breaking' ? 'Breaking' : 'Non-Breaking'} News Post`;
      group.resize(headlinePost.width + bodyPost.width + 20, Math.max(headlinePost.height, bodyPost.height));
      
      // Add components to group
      group.appendChild(headlinePost);
      group.appendChild(bodyPost);
      
      // Position components
      headlinePost.x = 0;
      headlinePost.y = 0;
      bodyPost.x = headlinePost.width + 20;
      bodyPost.y = 0;
      
      // Add group to Posts frame
      postsFrame.appendChild(group);
      
      // Position group in the Posts frame
      group.x = 0;
      group.y = 0;
      
      // Update headline text
      const textNodes = findAllTextNodes(headlinePost);
      let headlineNode = null;
      
      // Find headline node based on template type
      if (templateType === 'breaking') {
        headlineNode = textNodes.find(n => 
          n.name === 'Breaking_Headline' || 
          n.name.toLowerCase().includes('headline'));
      } else {
        // For non-breaking news
        headlineNode = textNodes.find(n => 
          n.characters.includes('TEST TEXT HERE') ||
          n.name === 'Nonbreaking_Headline' || 
          n.name.toLowerCase().includes('headline'));
      }
      
      if (headlineNode) {
        headlineNode.characters = headline;
      } else {
        figma.notify("Could not find headline text node");
      }
      
      // Update body text
      const bodyTextNodes = findAllTextNodes(bodyPost);
      const bodyNode = bodyTextNodes.find(n => 
        n.name === 'News_Body' || 
        n.name.toLowerCase().includes('body'));
      
      if (bodyNode) {
        bodyNode.characters = body;
      } else {
        figma.notify("Could not find body text node");
      }
      
      // Select the new post
      figma.currentPage.selection = [group];
      figma.viewport.scrollAndZoomIntoView([group]);
      
      figma.notify('Post created successfully');
      
    } catch (err) {
      console.error(err);
      figma.notify('Error: ' + (err.message || 'Unknown error'), { error: true });
    }
  }
};

// Helper function to find all text nodes in a node and its children
function findAllTextNodes(node) {
  const textNodes = [];
  
  if (node.type === 'TEXT') {
    textNodes.push(node);
  }
  
  // If the node has children, search them too
  if ('children' in node) {
    for (const child of node.children) {
      textNodes.push(...findAllTextNodes(child));
    }
  }
  
  return textNodes;
}