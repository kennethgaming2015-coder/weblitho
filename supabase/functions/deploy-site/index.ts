import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeployRequest {
  provider: 'netlify' | 'vercel';
  accessToken: string;
  projectName: string;
  files: Array<{ path: string; content: string }>;
  htmlContent?: string;
}

// Convert files to the format expected by Netlify/Vercel
function prepareFilesForDeploy(files: Array<{ path: string; content: string }>, htmlContent?: string) {
  const deployFiles: Record<string, string> = {};
  
  if (files && files.length > 0) {
    for (const file of files) {
      deployFiles[file.path] = file.content;
    }
  } else if (htmlContent) {
    deployFiles['index.html'] = htmlContent;
  }
  
  return deployFiles;
}

// Deploy to Netlify using their API
async function deployToNetlify(accessToken: string, projectName: string, files: Record<string, string>) {
  console.log('Starting Netlify deployment...');
  
  // First, create or get a site
  const siteName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'weblitho-site';
  
  // List existing sites to check if one exists
  const listResponse = await fetch('https://api.netlify.com/api/v1/sites', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (!listResponse.ok) {
    const error = await listResponse.text();
    console.error('Failed to list Netlify sites:', error);
    throw new Error(`Netlify authentication failed: ${error}`);
  }
  
  const sites = await listResponse.json();
  let site = sites.find((s: any) => s.name === siteName);
  
  // If site doesn't exist, create it
  if (!site) {
    console.log('Creating new Netlify site:', siteName);
    const createResponse = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: siteName,
      }),
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('Failed to create Netlify site:', error);
      throw new Error(`Failed to create Netlify site: ${error}`);
    }
    
    site = await createResponse.json();
    console.log('Created Netlify site:', site.id);
  } else {
    console.log('Using existing Netlify site:', site.id);
  }
  
  // Deploy files using the deploy API
  // First, calculate SHA1 hashes for each file
  const fileHashes: Record<string, string> = {};
  const fileContents: Record<string, string> = {};
  
  for (const [path, content] of Object.entries(files)) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    fileHashes['/' + path] = hash;
    fileContents[hash] = content;
  }
  
  console.log('Deploying files:', Object.keys(fileHashes));
  
  // Create deploy
  const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${site.id}/deploys`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: fileHashes,
    }),
  });
  
  if (!deployResponse.ok) {
    const error = await deployResponse.text();
    console.error('Failed to create Netlify deploy:', error);
    throw new Error(`Failed to create deploy: ${error}`);
  }
  
  const deploy = await deployResponse.json();
  console.log('Deploy created:', deploy.id, 'Required files:', deploy.required);
  
  // Upload required files
  for (const hash of deploy.required || []) {
    const content = fileContents[hash];
    if (content) {
      console.log('Uploading file with hash:', hash);
      const uploadResponse = await fetch(
        `https://api.netlify.com/api/v1/deploys/${deploy.id}/files/${hash}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/octet-stream',
          },
          body: content,
        }
      );
      
      if (!uploadResponse.ok) {
        const error = await uploadResponse.text();
        console.error('Failed to upload file:', error);
      }
    }
  }
  
  // Wait for deploy to be ready
  let deployStatus = deploy.state;
  let finalDeploy = deploy;
  let attempts = 0;
  
  while (deployStatus !== 'ready' && attempts < 30) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const statusResponse = await fetch(`https://api.netlify.com/api/v1/deploys/${deploy.id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (statusResponse.ok) {
      finalDeploy = await statusResponse.json();
      deployStatus = finalDeploy.state;
      console.log('Deploy status:', deployStatus);
    }
    
    attempts++;
  }
  
  return {
    success: deployStatus === 'ready',
    url: finalDeploy.ssl_url || finalDeploy.url || `https://${siteName}.netlify.app`,
    deployId: finalDeploy.id,
    siteId: site.id,
    siteName: site.name,
  };
}

// Deploy to Vercel using their API
async function deployToVercel(accessToken: string, projectName: string, files: Record<string, string>) {
  console.log('Starting Vercel deployment...');
  
  const name = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'weblitho-site';
  
  // Prepare files for Vercel deployment
  const vercelFiles = Object.entries(files).map(([path, content]) => ({
    file: path,
    data: btoa(unescape(encodeURIComponent(content))), // Base64 encode
  }));
  
  console.log('Deploying files to Vercel:', vercelFiles.map(f => f.file));
  
  // Create deployment
  const deployResponse = await fetch('https://api.vercel.com/v13/deployments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      files: vercelFiles,
      target: 'production',
      projectSettings: {
        framework: null, // Static site
      },
    }),
  });
  
  if (!deployResponse.ok) {
    const error = await deployResponse.text();
    console.error('Failed to create Vercel deployment:', error);
    throw new Error(`Vercel deployment failed: ${error}`);
  }
  
  const deployment = await deployResponse.json();
  console.log('Vercel deployment created:', deployment.id, 'URL:', deployment.url);
  
  // Wait for deployment to be ready
  let deploymentStatus = deployment.readyState;
  let finalDeployment = deployment;
  let attempts = 0;
  
  while (deploymentStatus !== 'READY' && deploymentStatus !== 'ERROR' && attempts < 60) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const statusResponse = await fetch(
      `https://api.vercel.com/v13/deployments/${deployment.id}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (statusResponse.ok) {
      finalDeployment = await statusResponse.json();
      deploymentStatus = finalDeployment.readyState;
      console.log('Vercel deployment status:', deploymentStatus);
    }
    
    attempts++;
  }
  
  return {
    success: deploymentStatus === 'READY',
    url: `https://${finalDeployment.url}`,
    deployId: finalDeployment.id,
    projectId: finalDeployment.projectId,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { provider, accessToken, projectName, files, htmlContent } = await req.json() as DeployRequest;
    
    console.log(`Deploying to ${provider} - Project: ${projectName}`);
    
    if (!accessToken) {
      throw new Error(`${provider} access token is required`);
    }
    
    const deployFiles = prepareFilesForDeploy(files, htmlContent);
    
    if (Object.keys(deployFiles).length === 0) {
      throw new Error('No files to deploy');
    }
    
    let result;
    
    if (provider === 'netlify') {
      result = await deployToNetlify(accessToken, projectName, deployFiles);
    } else if (provider === 'vercel') {
      result = await deployToVercel(accessToken, projectName, deployFiles);
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
    
    console.log('Deployment result:', result);
    
    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('Deployment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Deployment failed';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
