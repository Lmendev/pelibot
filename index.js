module.exports = require('./src/telegram');

var fs = require('fs');
var request = require("request");
var TelegramBot = require('node-telegram-bot-api');
 
var token = '116276511:AAH4ZXkuYu9Fxygxxwv01UAYiWgSQ3Yct0I';

var port = process.env.OPENSHIFT_NODEJS_PORT;
var host = process.env.OPENSHIFT_NODEJS_IP;

var bot = new TelegramBot(token, {webHook: {port: port, host: host}});
// OpenShift enroutes :443 request to OPENSHIFT_NODEJS_PORT

var status = 'main';
var city;
var theater;
var ciudades_registradas = [
					['Armenia', 'Barranquilla'],
					['Bogota', 'Bucaramanga'],
					['Buenaventura', 'Buga'],
					['Cali', 'Cartagena'],
					['Caucasia', 'Cucuta'],
					['Dosquebradas', 'Girardot'],
					['Ibague', 'Magangue'],
					['Medellin', 'Mosquera'],
					['Neiva', 'Pasto'],
					['Pereira', 'Pitalito'],
					['Popayan', 'Sincelejo'],
					['Yopal', 'Yumbo'],
				];

var download = function(uri, filename, callback){
  	request.head(uri, function(err, res, body){
    ////console.log('content-type:', res.headers['content-type']);
    ////console.log('content-length:', res.headers['content-length']);

    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

function inicio (msg) {
	var chatId = msg.chat.id;
	var opts = {
		reply_markup: JSON.stringify({
			keyboard: ciudades_registradas
		})
	};

	bot.sendMessage(chatId, 'Selecciona tu ciudad', opts);
	status = 'waiting_for_city';
}

bot.on('text', function (msg) {
	console.log(msg);
	
	if (msg.text == '/start') { 
		inicio(msg);
		return false;
  	}

	switch(status) {
		case 'waiting_for_city':
			//si la ciudad es valida
			city = msg.text;
			var url = "http://getinfomovies.esy.es/royal.php?ciudad="+city;  	
			request({
		    	url: url,
		    	json: true
			}, function (error, response, body) {
		    	if (!error && response.statusCode === 200) {
					var chatId = msg.chat.id;
					var theaters = [];

					for (var i = 0; i < body.theaters.length; i++) 
						theaters.push([body.theaters[i]]);
					theaters.push(['Volver']);

					var opts = {
						reply_markup: JSON.stringify({
							keyboard: theaters
						})
					};
					bot.sendMessage(chatId, 'Selecciona tu sala de cine', opts);					
					status = 'waiting_for_teather';
		    	}
			});
		break;
		case 'waiting_for_teather':
			//si sala es valida
			sala = msg.text;
			var url = "http://getinfomovies.esy.es/royal.php?ciudad="+city+"&sala="+sala;  	
			request({
		    	url: url,
		    	json: true
			}, function (error, response, body) {
		    	if (!error && response.statusCode === 200) {
					var chatId = msg.chat.id;
					
					var readInfo = function (index) {
						if(index === body.movies.length) {
							//console.log("Done");
						} else{
							var title = body.movies[index].title;
							var image_url = body.movies[index].image;
							//console.log(image_url);

							var photo = image_url.split("/")[image_url.split("/").length -1];

							fs.exists('images/'+photo, function(exists) {
								if (!exists) {
									download(image_url, 'images/'+photo, function() {
									  	//console.log('Imagen '+photo+' descargada');
									  	bot.sendPhoto(chatId, 'images/'+photo, {caption: title});
										readInfo(index + 1);
									});
								}else{
									bot.sendPhoto(chatId, 'images/'+photo, {caption: title});
									readInfo(index + 1);
								}
							});
							//bot.sendMessage(chatId, "Yo solo sé que nada sé");
						}
					}

					readInfo(0);
		    	}
			});
			
			if (msg.text == 'Volver') { 
				inicio(msg);
				return false;
		  	}
			
		break;
		default:
			
		break;
	}
	//console.log(status);	
});

