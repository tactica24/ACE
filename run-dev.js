const { execSync } = require('child_process');
const { NODE_ENV, ...env } = process.env;
const result = execSync('node node_modules/next/dist/bin/next dev', { 
  env: { 
    ...env, 
    NODE_ENV: 'development',
    NEXT_DISABLE_LOCKFILE_PATCH: '1' 
  }, 
  stdio: 'inherit' 
});