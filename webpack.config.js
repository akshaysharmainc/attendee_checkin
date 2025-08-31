const path = require('path');
const fs = require('fs');

// Check if src directory exists
const srcExists = fs.existsSync(path.join(__dirname, 'src'));

if (!srcExists) {
  console.warn('⚠️  Warning: src/ directory not found. This might be a deployment issue.');
}

module.exports = {
  entry: srcExists ? './src/index.js' : './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public'),
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.css'],
  },
  // Add better error handling for production builds
  stats: {
    errorDetails: true,
  },
  // Ensure webpack doesn't fail silently
  bail: true,
}; 