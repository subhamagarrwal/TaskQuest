//setting up the telegram bot
const TelgramBot = require('node-telegram-bot-api');
const {GraphQlClient} = require('@graphql-request');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {polling: true});

//client setup
const client = new GraphQlClient('http://localhost:4000/graphql', {
  headers: {
    Authorization: `Bearer ${process.env.GRAPHQL_API_TOKEN}`
  }
});