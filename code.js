// Show the plugin UI
figma.showUI(__html__, { width: 400, height: 650 });

// Listen for messages from the UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'create-post') {
    try {
      // Load the required font
      await figma.loadFontAsync({ family: "ITC Cheltenham Std", style: "Book" });
      
      // Extract the data from the message
      const { headline, body, caption, templateType, useCta, ctaType, instagram, force } = msg;
      
      // Check if we have duplicate posts with this headline (if not forced)
      if (!force) {
        const duplicates = findDuplicateHeadlines(headline);
        if (duplicates.length > 0) {
          figma.ui.postMessage({
            type: 'confirm-duplicate',
            message: `A post with this headline already exists. Create anyway?`
          });
          return; // Wait for user confirmation
        }
      }
      
      // This will hold references to all created elements
      const createdElements = [];
      
      // Create the post based on template type
      let headlinePost;
      if (templateType === 'breaking') {
        headlinePost = await createBreakingNewsPost(headline);
        createdElements.push(headlinePost);
        figma.notify("✅ Created breaking news post with your headline!");
      } else {
        headlinePost = await createNonBreakingNewsPost(headline);
        createdElements.push(headlinePost);
      }
      
      // Add body if provided
      let bodyPost = null;
      if (body && body.trim() !== "") {
        try {
          bodyPost = await createBodyPost(body, headlinePost);
          createdElements.push(bodyPost);
        } catch (error) {
          console.error("Error creating body post:", error);
          figma.notify("Created headline, but there was an error with the body: " + error.message);
        }
      }
      
      // Handle CTA and disclaimer if requested
      if (useCta) {
        try {
          const ctaPost = await createCtaPost(ctaType, bodyPost || headlinePost);
          createdElements.push(ctaPost);
          
          // Determine which disclaimer to use
          const usePerformanceData = (ctaType === 'politician' || ctaType === 'crypto' || ctaType === 'hedge-fund');
          
          // Add the appropriate disclaimer
          const disclaimerPost = await addDisclaimer(ctaPost, usePerformanceData);
          createdElements.push(disclaimerPost);
        } catch (error) {
          console.error("Error with CTA or disclaimer:", error);
          figma.notify(`Error with CTA: ${error.message}`, { error: true });
        }
      } else if (body && body.trim() !== "") {
        // Add only the disclaimer without performance data if there's a body but no CTA
        try {
          const disclaimerPost = await addDisclaimer(bodyPost, false);
          createdElements.push(disclaimerPost);
        } catch (error) {
          console.error("Error with disclaimer:", error);
          figma.notify(`Error with disclaimer: ${error.message}`, { error: true });
        }
      }
      
      // Add caption LAST if provided (moved after disclaimer)
      if (caption && caption.trim() !== "") {
        try {
          const captionElement = await createCaption(caption);
          createdElements.push(captionElement);
        } catch (error) {
          console.error("Error creating caption:", error);
          figma.notify("Created post, but there was an error with the caption: " + error.message);
        }
      }
      
      // Arrange all elements in a horizontal row with proper spacing
      arrangeElementsHorizontally(createdElements);
      
    } catch (error) {
      figma.notify(`❌ Error: ${error.message}`, { error: true });
      console.error("Error creating post:", error);
    }
  }
};

// Function to arrange all created elements in a horizontal row
function arrangeElementsHorizontally(elements) {
  if (elements.length <= 1) return;
  
  // Use the first element as our reference point
  const firstElement = elements[0];
  const SPACING = 144;
  
  // Start positioning from the first element
  let currentX = firstElement.x + firstElement.width + SPACING;
  
  // Position all subsequent elements
  for (let i = 1; i < elements.length; i++) {
    elements[i].x = currentX;
    elements[i].y = firstElement.y;
    currentX += elements[i].width + SPACING;
  }
  
  // Select all created elements
  figma.currentPage.selection = elements;
  figma.viewport.scrollAndZoomIntoView(elements);
}

// Function to find duplicate headlines in existing posts
function findDuplicateHeadlines(headline) {
  const duplicates = [];
  
  // Normalize the headline for comparison (lowercase, trim spaces)
  const normalizedHeadline = headline.toLowerCase().trim();
  
  // Search through all text nodes on the page
  figma.currentPage.findAll(node => {
    if (node.type === 'TEXT') {
      // Check if this is a headline text node (you might need to adjust this logic)
      const possibleHeadline = node.characters.toLowerCase().trim();
      if (possibleHeadline === normalizedHeadline) {
        duplicates.push(node);
      }
    }
    return false; // This just makes sure we continue scanning all nodes
  });
  
  return duplicates;
}

// Create a function to track and manage element positions
function positionNewElement(newElement, relatedElement, template) {
  // Use 144 unit spacing as requested
  const SPACING = 144;
  
  if (relatedElement) {
    // Position next to the related element
    newElement.x = relatedElement.x + relatedElement.width + SPACING;
    newElement.y = relatedElement.y;
  } else if (template) {
    // Position next to the template
    newElement.x = template.x + template.width + SPACING;
    newElement.y = template.y;
  }
  
  // Add the element to the current page
  figma.currentPage.appendChild(newElement);
  
  return newElement;
}

// Function to create a breaking news post
async function createBreakingNewsPost(headline) {
  // Find the breaking news template
  const breakingNewsTemplate = findBreakingNewsTemplate();
  
  if (!breakingNewsTemplate) {
    throw new Error("Breaking News Template not found on this page. Please make sure you have a template named 'Breaking News Template' in the 'Disclosed Advisors Templates' section.");
  }
  
  // Create a duplicate (clone) of the template
  const newPost = breakingNewsTemplate.clone();
  figma.notify("Duplicated Breaking News template");
  
  // Position the first element relative to its template
  newPost.x = breakingNewsTemplate.x + breakingNewsTemplate.width + 144;
  newPost.y = breakingNewsTemplate.y;
  
  // Add the cloned template to the current page
  figma.currentPage.appendChild(newPost);
  
  // Find the headline text node within the template
  const headlineTextNode = findHeadlineTextNode(newPost);
  
  if (!headlineTextNode) {
    throw new Error("Headline text node not found in the template. Make sure your template has a text layer named 'Breaking_Headline'.");
  }
  
  // Update the headline text
  figma.notify("Found headline text box, updating text...");
  
  // Get the font before changing it
  const fontName = headlineTextNode.fontName;
  // Load the font
  await figma.loadFontAsync(fontName);
  
  headlineTextNode.characters = headline;
  
  // Apply the correct font styling
  headlineTextNode.fontName = { family: "ITC Cheltenham Std", style: "Book" };
  headlineTextNode.fontSize = 100;
  headlineTextNode.lineHeight = { value: 102, unit: 'PERCENT' };
  
  return newPost;
}

// Function to find the breaking news template
function findBreakingNewsTemplate() {
  // First try to find the template by name
  const templateByName = figma.currentPage.findOne(node => 
    (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') && 
    node.name === "Breaking News Template"
  );
  
  if (templateByName) {
    return templateByName;
  }
  
  // If not found by name, look for it in the Disclosed Advisors Templates section
  const templatesSection = figma.currentPage.findOne(node => 
    node.type === 'FRAME' && 
    node.name === "Disclosed Advisors Templates"
  );
  
  if (!templatesSection) {
    return null;
  }
  
  // Look for the Breaking News Template inside the section
  return templatesSection.findOne(node => 
    (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') && 
    node.name === "Breaking News Template"
  );
}

// Function to find the headline text node within a post template
function findHeadlineTextNode(postFrame) {
  // First try to find the text node by name
  const textNodeByName = postFrame.findOne(node => 
    node.type === 'TEXT' && 
    node.name === "Breaking_Headline"
  );
  
  if (textNodeByName) {
    return textNodeByName;
  }
  
  // If not found by name, look for any text node with TEST TEXT HERE
  return postFrame.findOne(node => 
    node.type === 'TEXT' && 
    node.characters.includes('TEST TEXT HERE')
  );
}

// This function would be implemented later
async function createNonBreakingNewsPost(headline) {
  // Find the non-breaking news template
  const nonBreakingNewsTemplate = findNonBreakingNewsTemplate();
  
  if (!nonBreakingNewsTemplate) {
    throw new Error("Non Breaking News Template not found on this page. Please make sure you have a template named 'Non Breaking News Template' in the 'Disclosed Advisors Templates' section.");
  }
  
  // Create a duplicate (clone) of the template
  const newPost = nonBreakingNewsTemplate.clone();
  figma.notify("Duplicated Non Breaking News template");
  
  // Position the new post
  positionNewElement(newPost, null, nonBreakingNewsTemplate);
  
  // Find the headline text node within the template
  const headlineTextNode = findNonBreakingHeadlineTextNode(newPost);
  
  if (!headlineTextNode) {
    throw new Error("Headline text node not found in the template. Make sure your template has a text layer named 'Nonbreaking_Headline'.");
  }
  
  // Update the headline text
  figma.notify("Found headline text box, updating text...");
  headlineTextNode.characters = headline;
  
  // Apply the correct font styling
  headlineTextNode.fontName = { family: "ITC Cheltenham Std", style: "Book" };
  headlineTextNode.fontSize = 100;
  headlineTextNode.lineHeight = { value: 102, unit: 'PERCENT' };
  
  return newPost;
}

// Function to find the non-breaking news template
function findNonBreakingNewsTemplate() {
  // First try to find the template by name
  const templateByName = figma.currentPage.findOne(node => 
    (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') && 
    node.name === "Non Breaking News Template"
  );
  
  if (templateByName) {
    return templateByName;
  }
  
  // If not found by name, look for it in the Disclosed Advisors Templates section
  const templatesSection = figma.currentPage.findOne(node => 
    node.type === 'FRAME' && 
    node.name === "Disclosed Advisors Templates"
  );
  
  if (!templatesSection) {
    return null;
  }
  
  // Look for the Non Breaking News Template inside the section
  return templatesSection.findOne(node => 
    (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') && 
    node.name === "Non Breaking News Template"
  );
}

// Function to find the headline text node within a non-breaking news post template
function findNonBreakingHeadlineTextNode(postFrame) {
  // First try to find the text node by name
  const textNodeByName = postFrame.findOne(node => 
    node.type === 'TEXT' && 
    node.name === "Nonbreaking_Headline"
  );
  
  if (textNodeByName) {
    return textNodeByName;
  }
  
  // If not found by name, fall back to a generic search
  return postFrame.findOne(node => 
    node.type === 'TEXT' && 
    (node.characters.includes('TEST TEXT HERE') || node.characters.includes('Headline'))
  );
}

// Function to create a body post
async function createBodyPost(body, headlinePost) {
  try {
    // Find the body template
    const bodyTemplate = findBodyTemplate();
    
    if (!bodyTemplate) {
      throw new Error("News Body Template not found on this page. Please make sure you have a template named 'News Body Template' in the 'Disclosed Advisors Templates' section.");
    }
    
    figma.notify(`Found body template: ${bodyTemplate.name}`);
    
    // Create a duplicate (clone) of the template
    const newBodyPost = bodyTemplate.clone();
    figma.notify("Duplicated News Body template");
    
    // Add to page (positioning will be done later)
    figma.currentPage.appendChild(newBodyPost);
    
    // Find the body text node
    const bodyTextNode = findBodyTextNode(newBodyPost);
    
    if (!bodyTextNode) {
      throw new Error("Body text node not found in the template. Make sure your template has a text layer named 'News_Body'.");
    }
    
    // Update the text with proper font handling
    await safelyModifyText(bodyTextNode, body);
    
    return newBodyPost;
  } catch (error) {
    console.error("Error in createBodyPost:", error);
    throw error;
  }
}

// Helper function to safely modify text content with proper font loading
async function safelyModifyText(textNode, newText) {
  try {
    // First approach: Try with SF Pro Display Semibold (the required font)
    try {
      const targetFont = { family: "SF Pro Display", style: "Semibold" };
      await figma.loadFontAsync(targetFont);
      textNode.characters = newText;
      
      // Apply the correct styling
      textNode.fontName = targetFont;
      textNode.fontSize = 56;
      textNode.lineHeight = { value: 102, unit: 'PERCENT' };
      
      figma.notify("Successfully updated text with SF Pro Display Semibold");
      return;
    } catch (fontError) {
      console.warn("Could not use SF Pro Display Semibold, trying original font:", fontError);
    }
    
    // Second approach: Try with the existing font
    try {
      const existingFont = textNode.fontName;
      await figma.loadFontAsync(existingFont);
      textNode.characters = newText;
      
      // Keep the existing font but update size and line height
      textNode.fontSize = 56;
      textNode.lineHeight = { value: 102, unit: 'PERCENT' };
      
      figma.notify("Updated text with existing font (SF Pro Display not available)");
      return;
    } catch (fontError) {
      console.warn("Could not use existing font, trying fallback:", fontError);
    }
    
    // Third approach: Try with a system font
    try {
      const fallbackFont = { family: "Inter", style: "Medium" };
      await figma.loadFontAsync(fallbackFont);
      textNode.fontName = fallbackFont;
      textNode.characters = newText;
      
      // Apply similar styling with fallback font
      textNode.fontSize = 56;
      textNode.lineHeight = { value: 102, unit: 'PERCENT' };
      
      figma.notify("Updated text with fallback font (Inter Medium)");
      return;
    } catch (fallbackError) {
      console.warn("Fallback font failed, trying last resort:", fallbackError);
    }
    
    // Last resort: Just try to set the text without changing the font
    textNode.characters = newText;
    figma.notify("Updated text content only (font unchanged)");
  } catch (error) {
    console.error("All text update methods failed:", error);
    throw new Error("Could not update text: " + error.message);
  }
}

// Function to find the body text node within a body post template
function findBodyTextNode(postFrame) {
  // Log what we're searching in
  console.log(`Searching for body text node in ${postFrame.type} named "${postFrame.name}"`);
  
  // First try to find the text node by exact name
  let textNodeByName = postFrame.findOne(node => 
    node.type === 'TEXT' && 
    node.name === "News_Body"
  );
  
  if (textNodeByName) {
    console.log("Found text node by exact name: News_Body");
    return textNodeByName;
  }
  
  // Try with alternative naming
  textNodeByName = postFrame.findOne(node => 
    node.type === 'TEXT' && 
    (node.name === "News Body" || 
     node.name.toLowerCase().includes("body") || 
     node.name.toLowerCase().includes("text"))
  );
  
  if (textNodeByName) {
    console.log("Found text node by alternative name:", textNodeByName.name);
    return textNodeByName;
  }
  
  // If we're dealing with a component instance, try to get all text nodes in it
  if (postFrame.type === 'INSTANCE') {
    const textNodesInInstance = [];
    postFrame.findAll(node => {
      if (node.type === 'TEXT') {
        textNodesInInstance.push(node);
      }
      return false;
    });
    
    console.log(`Found ${textNodesInInstance.length} text nodes in component instance`);
    
    // If there's just one text node, that's probably our body
    if (textNodesInInstance.length === 1) {
      return textNodesInInstance[0];
    }
    
    // If there are multiple, look for the largest one
    if (textNodesInInstance.length > 0) {
      let largestNode = textNodesInInstance[0];
      let maxChars = largestNode.characters.length;
      
      for (const node of textNodesInInstance) {
        if (node.characters.length > maxChars) {
          maxChars = node.characters.length;
          largestNode = node;
        }
      }
      
      console.log("Using largest text node in component instance:", largestNode.name);
      return largestNode;
    }
  }
  
  // If not found by name, try to find the biggest text node which likely holds the body
  let largestTextNode = null;
  let maxLength = 0;
  
  postFrame.findAll(node => {
    if (node.characters.length > maxLength) {
      maxLength = node.characters.length;
      largestTextNode = node;
    }
  });
  
  if (largestTextNode) {
    console.log("Found largest text node as fallback:", largestTextNode.name);
    return largestTextNode;
  }
  
  // Last resort: any text node with placeholder content
  return postFrame.findOne(node => 
    node.type === 'TEXT' && 
    (node.characters.includes('TEST TEXT HERE') || 
     node.characters.includes('Body') || 
     node.characters.includes('body') || 
     node.characters.includes('Lorem ipsum'))
  );
}

// Function to find the body template
function findBodyTemplate() {
  // First try to find the template by name directly on the current page
  let templateByName = figma.currentPage.findOne(node => 
    (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') && 
    node.name === "News Body Template"
  );
  
  if (templateByName) {
    console.log("Found body template directly on page");
    return templateByName;
  }
  
  // If not found by name, look for it in the Disclosed Advisors Templates section
  const templatesSection = figma.currentPage.findOne(node => 
    (node.type === 'FRAME' || node.type === 'SECTION') && 
    node.name === "Disclosed Advisors Templates"
  );
  
  if (!templatesSection) {
    console.error("Couldn't find the Disclosed Advisors Templates section");
    return null;
  }
  
  console.log("Found templates section, looking for News Body Template inside it");
  
  // Look at all children of the templates section, not just direct ones
  let bodyTemplate = null;
  templatesSection.findAll(node => {
    if ((node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') && 
        node.name === "News Body Template") {
      bodyTemplate = node;
      return true;
    }
    return false;
  });
  
  if (bodyTemplate) {
    console.log("Found body template inside templates section");
  } else {
    console.error("Body template not found in templates section");
  }
  
  return bodyTemplate;
}

// Function to add CTA and appropriate disclaimer
async function addCtaAndDisclaimer(relatedPost, ctaType) {
  try {
    // First add the CTA
    const ctaPost = await createCtaPost(ctaType, relatedPost);
    
    // Determine which disclaimer to use
    const usePerformanceData = (ctaType === 'politician' || ctaType === 'crypto' || ctaType === 'hedge-fund');
    
    // Add the appropriate disclaimer
    await addDisclaimer(ctaPost, usePerformanceData);
    
    return ctaPost;
  } catch (error) {
    console.error("Error adding CTA and disclaimer:", error);
    figma.notify(`Error with CTA: ${error.message}`, { error: true });
    throw error;
  }
}

// Function to create a CTA post
async function createCtaPost(ctaType, relatedPost) {
  // Find the appropriate CTA template
  const ctaTemplate = findCtaTemplate(ctaType);
  
  if (!ctaTemplate) {
    throw new Error(`${ctaType.charAt(0).toUpperCase() + ctaType.slice(1)} CTA template not found in the 'Disclosed Advisors Templates' section.`);
  }
  
  // Create a duplicate of the template
  const newCtaPost = ctaTemplate.clone();
  figma.notify(`Duplicated ${ctaType} CTA template`);
  
  // Position with our new function
  positionNewElement(newCtaPost, relatedPost, ctaTemplate);
  
  return newCtaPost;
}

// Function to find the appropriate CTA template
function findCtaTemplate(ctaType) {
  let templateName;
  
  switch (ctaType) {
    case 'politician':
      templateName = "CTA Politician Template";
      break;
    case 'crypto':
      templateName = "CTA Crypto Template";
      break;
    case 'hedge-fund':
      templateName = "CTA Hedge Fund Template";
      break;
    case 'search':
      templateName = "Search CTA Template";
      break;
    default:
      throw new Error(`Unknown CTA type: ${ctaType}`);
  }
  
  // First try to find the template by name on the current page
  const templateByName = figma.currentPage.findOne(node => 
    (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') && 
    node.name === templateName
  );
  
  if (templateByName) {
    return templateByName;
  }
  
  // If not found by name, look for it in the Disclosed Advisors Templates section
  const templatesSection = figma.currentPage.findOne(node => 
    (node.type === 'FRAME' || node.type === 'SECTION') && 
    node.name === "Disclosed Advisors Templates"
  );
  
  if (!templatesSection) {
    return null;
  }
  
  // Look for the CTA template inside the section
  return templatesSection.findOne(node => 
    (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') && 
    node.name === templateName
  );
}

// Function to add the appropriate disclaimer
async function addDisclaimer(relatedPost, withPerformanceData) {
  try {
    // Find the appropriate disclaimer template
    const disclaimerTemplate = findDisclaimerTemplate(withPerformanceData);
    
    if (!disclaimerTemplate) {
      throw new Error(`Disclaimer template ${withPerformanceData ? 'with' : 'without'} performance data not found in the 'Disclosed Advisors Templates' section.`);
    }
    
    // Create a duplicate of the template
    const newDisclaimerPost = disclaimerTemplate.clone();
    figma.notify(`Duplicated disclaimer template ${withPerformanceData ? 'with' : 'without'} performance data`);
    
    // Position with our new function
    positionNewElement(newDisclaimerPost, relatedPost, disclaimerTemplate);
    
    return newDisclaimerPost;
  } catch (error) {
    console.error("Error adding disclaimer:", error);
    figma.notify(`Error with disclaimer: ${error.message}`, { error: true });
    throw error;
  }
}

// Function to find the appropriate disclaimer template
function findDisclaimerTemplate(withPerformanceData) {
  const templateName = withPerformanceData ? 
    "Disclaimer Template With Performance Data" : 
    "Disclaimer Template No Performance Data";
  
  // First try to find the template by name on the current page
  const templateByName = figma.currentPage.findOne(node => 
    (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') && 
    node.name === templateName
  );
  
  if (templateByName) {
    return templateByName;
  }
  
  // If not found by name, look for it in the Disclosed Advisors Templates section
  const templatesSection = figma.currentPage.findOne(node => 
    (node.type === 'FRAME' || node.type === 'SECTION') && 
    node.name === "Disclosed Advisors Templates"
  );
  
  if (!templatesSection) {
    return null;
  }
  
  // Look for the disclaimer template inside the section
  return templatesSection.findOne(node => 
    (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') && 
    node.name === templateName
  );
}

// Function to create a caption
async function createCaption(captionText) {
  try {
    // Find the caption template
    const captionTemplate = findCaptionTemplate();
    
    if (!captionTemplate) {
      throw new Error("Caption Template not found on this page. Please make sure you have a template named 'Caption Template' in the 'Disclosed Advisors Templates' section.");
    }
    
    figma.notify("Found caption template");
    
    // Create a duplicate of the template
    const newCaption = captionTemplate.clone();
    figma.notify("Duplicated Caption Template");
    
    // Add to page (positioning will be handled by arrangeElementsHorizontally)
    figma.currentPage.appendChild(newCaption);
    
    // Find the text node in the caption template
    const captionTextNode = findCaptionTextNode(newCaption);
    
    if (!captionTextNode) {
      throw new Error("Caption text node not found in the template.");
    }
    
    // Update the caption text with proper font handling
    await safelyModifyText(captionTextNode, captionText);
    
    return newCaption;
  } catch (error) {
    console.error("Error in createCaption:", error);
    throw error;
  }
}

// Function to find the caption template
function findCaptionTemplate() {
  // First try to find the template by name directly on the current page
  let templateByName = figma.currentPage.findOne(node => 
    (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'TEXT') && 
    node.name === "Caption Template"
  );
  
  if (templateByName) {
    console.log("Found caption template directly on page");
    return templateByName;
  }
  
  // If not found by name, look for it in the Disclosed Advisors Templates section
  const templatesSection = figma.currentPage.findOne(node => 
    (node.type === 'FRAME' || node.type === 'SECTION') && 
    node.name === "Disclosed Advisors Templates"
  );
  
  if (!templatesSection) {
    console.error("Couldn't find the Disclosed Advisors Templates section");
    return null;
  }
  
  console.log("Found templates section, looking for Caption Template inside it");
  
  // Look at all children of the templates section
  let captionTemplate = null;
  templatesSection.findAll(node => {
    if ((node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'TEXT') && 
        node.name === "Caption Template") {
      captionTemplate = node;
      return true;
    }
    return false;
  });
  
  if (captionTemplate) {
    console.log("Found caption template inside templates section");
  } else {
    console.error("Caption template not found in templates section");
  }
  
  return captionTemplate;
}

// Function to find the text node in a caption template
function findCaptionTextNode(captionElement) {
  // If the element itself is a text node, return it
  if (captionElement.type === 'TEXT') {
    return captionElement;
  }
  
  // Otherwise look for a text node inside it
  return captionElement.findOne(node => node.type === 'TEXT');
}
