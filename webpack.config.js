const path = require('path');
const { merge } = require('webpack-merge');
const { HotModuleReplacementPlugin, ProvidePlugin } = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const AntdDayjsWebpackPlugin = require('antd-dayjs-webpack-plugin');
const LodashWebpackPlugin = require('lodash-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ReactRefreshPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const WebpackBarPlugin = require('webpackbar');
const FriendlyErrorsWebpackPlugin = require('@soda/friendly-errors-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const env = require('./utils/env');

const isDevelopment = env.NODE_ENV !== 'production';
const isAnalyzer = env.ANALYZER === 'true';

let config = {
  entry: {
    background: path.resolve(__dirname, 'src/pages/Background/index.ts'),
    popup: path.resolve(__dirname, 'src/pages/Popup/index.tsx'),
    options: path.resolve(__dirname, 'src/pages/Options/index.tsx'),
    mfaHelperCore: path.resolve(__dirname, 'src/pages/ContentScripts/MfaHelperCore/index.ts'),
    mfaHelperOverlay: path.resolve(__dirname, 'src/pages/ContentScripts/MfaHelperOverlay/index.tsx'),
    enrollmentHelper: path.resolve(__dirname,'src/pages/ContentScripts/EnrollmentHelper/index.tsx'),
    manualMfaSetup: path.resolve(__dirname,'src/pages/ManualMFASetup/index.tsx'),
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].bundle.js',
    publicPath: '/',
  },
  boilerplateConfig: {
    notHotReload: ['background', 'mfaHelperCore', 'mfaHelperOverlay', 'enrollmentHelper'],
    backgroundScripts: ['background'],
    contentScrips: ['mfaHelperCore', 'mfaHelperOverlay', 'enrollmentHelper'],
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/i,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.less$/i,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'less-loader',
            options: {
              lessOptions: {
                modifyVars: {
                  'primary-color': '#ff7500',
                  'link-color': '#ff7500',
                },
                javascriptEnabled: true,
              }
            },
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              name: '[name]_[hash:6].[ext]',
              esModule: false,
              limit: 0,
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new AntdDayjsWebpackPlugin(),
    new LodashWebpackPlugin(),
    new ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'public'),
          to: path.resolve(__dirname, 'build'),
        },
      ],
    }),
    new HtmlWebpackPlugin({
      filename: 'popup.html',
      template: path.resolve(__dirname, 'src/templates/default.ejs'),
      minify: !isDevelopment,
      chunks: ['popup'],
    }),
    new HtmlWebpackPlugin({
      filename: 'options.html',
      template: path.resolve(__dirname, 'src/templates/default.ejs'),
      minify: !isDevelopment,
      chunks: ['options'],
    }),
    new HtmlWebpackPlugin({
      filename: 'manualMfaSetup.html',
      template: path.resolve(__dirname, 'src/templates/default.ejs'),
      minify: !isDevelopment,
      chunks: ['manualMfaSetup'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    fallback: {
      buffer: require.resolve('buffer/'),
    },
  },
};

if (isDevelopment) {
  config = merge(config, {
    mode: 'development',
    stats: false,
    devtool: 'inline-cheap-module-source-map',
    plugins: [
      new FriendlyErrorsWebpackPlugin(),
      new HotModuleReplacementPlugin(),
      new ReactRefreshPlugin({
        overlay: false,
      }),
    ],
    resolve: {
      alias: {
        'react-dom': '@hot-loader/react-dom',
      },
    },
  });
} else {
  config = merge(config, {
    mode: 'production',
    module: {
      rules: [
        {
          test: /\.[jt]sx?$/i,
          enforce: 'pre',
          exclude: /node_modules/,
          use: [
            {
              loader: 'webpack-strip-block',
              options: {
                start: 'debug:start',
                end: 'debug:end',
              },
            },
          ],
        },
      ],
    },
    plugins: [
      new WebpackBarPlugin(),
      ...(isAnalyzer ? [
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          analyzerHost: env.HOST,
          analyzerPort: env.PORT,
          logLevel: 'silent',
        }),
      ] : []),
    ],
    optimization: {
      minimizer: [
        new TerserPlugin({
          extractComments: false,
        }),
        new CssMinimizerPlugin(),
      ],
    },
    performance: {
      maxEntrypointSize: 4096000,
      maxAssetSize: 1024000,
    },
  });
}

module.exports = config;
