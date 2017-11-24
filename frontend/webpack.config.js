const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = function(env) {
  return {
    entry: {
      'bundle': path.resolve(__dirname, './app/main.js'),
    },
    output: {
      path: path.resolve(__dirname, './build'),
      publicPath: '/',
      filename: '[name].[hash].js'
    },
    resolve: {
      extensions: ['.js', '.vue'],
      modules: ['node_modules'],
      alias: {
        'vue$': 'vue/dist/vue.esm.js'
      }
    },
    resolveLoader: {
      modules: [
           path.resolve(__dirname, './node_modules')
      ],
    },
    module: {
      rules: [{
        test: /\.js$/,
        use: [{
          loader: 'babel-loader',
          options: {
            presets: ['env', 'stage-2'],
          },
                }],
            }, {
        test: /\.html$/,
        loader: 'vue-html-loader',
        options: {
          minimize: true,
          removeComments: true,
          collapseWhitespace: true
        }
            }, {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          loaders: {
            js: 'babel-loader?presets[]=env&presets[]=stage-2'
          }
        }
            }, {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: 'css-loader?minimize=true',
        }),
            }],
    },

    plugins: [
            new webpack.NamedModulesPlugin(),
            new webpack.HotModuleReplacementPlugin({}),
            new webpack.optimize.ModuleConcatenationPlugin(),
            new ExtractTextPlugin('[name].[hash].css'),
            new CleanWebpackPlugin(['build']),
            new HtmlWebpackPlugin({
        inject: 'body',
        template: path.resolve(__dirname, './index.html'),
        // favicon: PATHS.source + '/assets/gb_fav.ico',
        minify: {
          caseSensitive: true,
          collapseWhitespace: true
        }
      }),
           new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: "'" + env.NODE_ENV + "'"
        }
      }),
        ],
    devServer: {
      historyApiFallback: true,
      // https: true,
      port: 4242,
      hot: true,
      inline: true,
      noInfo: false,
      contentBase: path.resolve(__dirname),
      compress: true,
    }
  }
}
