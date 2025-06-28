export default function errorHandler(error, ctx) {
    console.error('Error occurred:', error);
    ctx.reply('An error occurred while processing your request. Please try again later.');
}