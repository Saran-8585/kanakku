export default {
  apps: [
    {
      name: 'kanakku-server',
      script: 'dist/index.js',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};