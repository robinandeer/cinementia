/* Author: Robin Andeer */

// remap jQuery to $
(function($){})(window.jQuery);

/* trigger when page is ready */
//$(document).ready(function (){});

// Set up local user in LS if not already exist
if (!amplify.store().xp) {
	amplify.store( 'completed', {} );
	amplify.store( 'achievements', { collected: {}, current: {} } );
	amplify.store( 'nametag', 'anonymous' );
	amplify.store( 'xp', 0 );
	amplify.store( 'playcount', 0 );
	amplify.store( 'highscore', [{score: 0, tag: 'This could be you!'}, {score: 0, tag: 'This could be you!'}, {score: 0, tag: 'This could be you!'}] );
}

// Set up Ajax request
amplify.request.define( 'ajaxRESTFulExample', 'ajax', {
	url: '/addmore?lastMovie={lastMovie}&amount={number}',
	type: 'GET'
});

// Ajax request for movies
function ajaxMovies(amount) {
	// Ajax call
	amplify.request( "ajaxRESTFulExample",
		{
			'lastMovie': game.lastMovie,
			'number': amount
		},
		function( data ) {
			
			if (game.currentMovie === null) {
				
				// Save for debug
				//window.tempData = data;
				
				// Before preload (spinner etc)
				$('<img id="ajaxloader" src="img/ajax-loader.gif">').insertAfter(".sub");
				$('.resLink, #play-help').remove();
				
				$.loadImages(data.imgs, function() {
					// Hide & Show
					$('.play').toggleClass('play reload');
					$('#ajaxloader, .sub, .links, .step1, .step2, .step3, .hint').remove();
					$('.gamelogo').css('margin-bottom', '30px')
					$('#box').css('padding-top', '1%');
					$('#playarea').addClass('activate');
					$.sticky('And so it begins... Good luck!');
				});
			}
			
			// Remove old "articles"
			$('.marked').remove();
			
			// On success
			$(".score").after(data.html); // HTML content
			
			// Set up game
			for (var movie in data.movies){
				// Create new movie object and add to list
				var tempMovie = {
					'title': data.movies[movie].title,
					'order': data.movies[movie].order,
					'difficulty': data.movies[movie].frame,
					'id': data.movies[movie].id,
					'genre': data.movies[movie].genre,
					'country': data.movies[movie].country,
					'numID': data.movies[movie].numID
				};
				addMovie(tempMovie);
				// Add title to list for autocomplete
				game.titles.push(data.movies[movie].title);
			}
						
			// Set first movie
			if (!game.currentMovie) {
				// New currentMovie
				game.currentMovie = getMovie();
				$('#movie1').toggleClass('qd');
			}
		}
	);
}

// Playbtn
$('.play').live('click', function() {	
	// Get first 7 movies
	ajaxMovies(7);
});

// Reload to re-play
$('.reload').live('click', function() {
	location.reload();
});

// Set up game
var game = {
	// List of all loaded movies
	movielist: [],
	// Last movie of list
	lastMovie: 0,
	// Current movie pointer
	currentMovie: null,
	// Movie titles for auto complete
	titles: []
};

var player = {
	// The life of the player
	lifeForce: 30,
	score: 0,
	accoladeScore: 0,
	// Get the "local" high score (list of objects) from localStorage
	highscore: amplify.store().highscore,
	// Experience points
	xp: amplify.store().xp,
	// Nametag
	nametag: amplify.store().nametag,
	// XP increase
	xpincrease: 0,
	// Keeps track of consecutive correct answers (bonus)
	chain: 0,
	// Correct answers
	corrects: 0,
	// Local completed movies
	completed: amplify.store().completed,
	// Achievements
	achievements: [],
	// Accolades (round based)
	accolades: [],
	// Genre count
	genreCount: {comedy: 0, drama: 0, thriller: 0, action: 0, fantasy: 0, 'sci-fi': 0, horror: 0, crime: 0, adventure: 0, romance: 0, documentary: 0, biography: 0, war: 0, musical: 0},
	// Playcount
	playcount: amplify.store().playcount
};

// Write nametag
$('#nametag').html(player.nametag);

// Check if first-timer
if (amplify.store().playcount == 0) {
	setTimeout("$('.links').append('<div class=\"step1\">1</div><div class=\"hint\">First time? Click here to enter a username!</div>');", 2000);
	setTimeout("$('.menu').append('<div class=\"step2\">2</div><div class=\"hint sec\">...and here to learn more about the game.</div>');", 2500);
	setTimeout("$('body').prepend('<div class=\"step3\">3</div><div class=\"hint third\">Too easy or too hard? Any feedback is greatly appreciated!</div>');", 3000);
	
}

// **** FUNCTIONS **** \\
// Add or remove lives from the player-obj
function changeLife(change, movie) {
	player.lifeForce += change;
	
	// Update DOM
	$.sticky(movie); //  + '<br>' + 'Life: ' + player.lifeForce
	
	// Check if player is Still Alive
	if (player.lifeForce > 0) {
		// Reset chain-score
		player.chain = 0;
		
		setTimeout("flip2Next(); $('.scorefloater').removeClass('floating');", 1500);
	} else {
		theEnd();
	}	
}

function theEnd() {
	// POPULATE SCORE CARD
	
	// Award xp
	player.xpincrease = player.score;
	
	// Place callback
	if (player.score < 100) {
		var callback = 'A meager attempt.';
	} else if (player.score < 500) {
		var callback = 'Nothing to write home about.';
	} else if (player.score < 1000) {
		var callback = 'Your getting there!';
	} else if (player.score < 5000) {
		var callback = 'A valiant effort.';
	} else if (player.score < 8000) {
		var callback = 'Stupendous!';
	} else if (player.score >= 8000) {
		var callback = 'Wow! And that took you how long?';
	}
	$('.callback').html(callback);
	
	// BACK-END
	// Find where to put new high score
	var i = 2;
	while (player.highscore[i].score < player.score) {
		i -= 1;
		if (i == -1) {
			break;
		}
	}
	
	if (i < 2) {
		// Fill in summary with STAR
		$('#endscore').append(player.score + 'p');
	
		// Splice out the "less than" part of high score
		var tempHighscore = player.highscore.splice(i+1);
		// Add the new entry
		player.highscore.push({ score: player.score, tag: $('#nametag').html() });
		// Add the others
		player.highscore = player.highscore.concat(tempHighscore);
		// Remove the last
		player.highscore.splice(3);
	} else {
		// Fill in summary with STAR
		$('#endscore').html(player.score + 'p');
	}
	
	// Dump/Replace all info in localStorage
	amplify.store( "highscore", player.highscore );
	amplify.store( "completed", player.completed );
	amplify.store( 'nametag', $('#nametag').html() );
	amplify.store( 'xp', player.xp + player.xpincrease );
	amplify.store( 'playcount', player.playcount + 1 );
	
	// Show score-card
	$('.score').css('opacity', '1');
	// Hide all else
	$('.wrapper:not(".score")').toggle();
	
	// NOTIFY & Update results
	setTimeout( "$.sticky('The End. Please reload to try again!'); 	updateResults();", 1500 );
	
}

// Replay/reload
$('.replay').bind('click', function() {
	window.location.reload()
});

// Add more movie (Ajax)
function addMovie(movie) {
	game.movielist.push(movie);
	// Update lastMovie
	game.lastMovie += 1;
};

// Get first movie (remove)
function getMovie(movie) {
	return game.movielist.shift();
}

function flip2Next() {	
	$('#movie' + game.currentMovie.order).toggleClass('fin');
	$('#movie' + (game.currentMovie.order+1)).toggleClass('qd');
	
	// Get more movies from server every fifth completed answer
	if (game.currentMovie.order%5 == 0) {
		ajaxMovies(5);
	}
	
	// Have you finished all the 400 movies?
	/*if (game.currentMovie.order == game.lastMovie) {
		theEnd();
		$.sticky('Congrats! Incredibly, you made it through every single movie!');
	}*/
	
	// Update the currentMovie
	game.currentMovie = getMovie();
	
}

function updateResults() {
	// RESULTS
	// Highscore
	var highstr = '';
	for (var i in amplify.store().highscore) {
		highstr += '<li><p>' + amplify.store().highscore[i].score + '</p><p>' + amplify.store().highscore[i].tag + '</p></li>'
	}
	$('#highscorelist').html(highstr);
	
	// ID card
	var count = 1;
	var xp = amplify.store().xp;
	while (xp > Math.pow(count,2)*500) {
		count += 1;
	}
	
	var level = {level: count, up: Math.pow(count,2)*500};
	
	$('h4').html( amplify.store().nametag );
	$('#xp').html( '<b>' + xp + '</b>/' + level.up );
	$('#level').html( 'Level ' + level.level );
	$('.progress').html( '<div class="bar" style="width:' + xp/level.up*100 + '%"></div>' );
	
	// Games played
	$('.bignumber').html( amplify.store().playcount );
}

// Fill results on load
updateResults();

// GUESSES INITIATE THIS!!
$('.choices li').live('click', function() {
	
	if ($(this).hasClass('correct')) {
		// YOU ARE CORRECT
		
		// Show the title card
		$('#movie' + game.currentMovie.order).children('.item').toggleClass('revealy');
		
		// Score increase
		var increase = game.currentMovie.difficulty + player.chain;
		
		// Award appropriate score + bonus (chain)
		player.score += increase;
		// Set score notification and show floater
		$('#playarea').append('<div class="scorefloater floating">+' + increase + ' xp</div>');
		player.chain += 10;
//		player.corrects += 1;
		// Keep track of corrects/genre for possible bonus
		player.genreCount[game.currentMovie.genre] += 1;
		
		// Save correct answer in "localStorage"
		if (player.completed && !player.completed['mov'+game.currentMovie.numID]) {
			player.completed['mov'+game.currentMovie.numID] = game.currentMovie.id;
		}
		
		// Wait and send to next Q
		setTimeout( "flip2Next(); $('.scorefloater').removeClass('floating');" , 1000);
				
		$(this).css({'background': 'none'});
	} else {
		// Notify the user
		var missedMovie = 'Answer: ' + game.currentMovie.title;
		if (game.currentMovie.title.length > 50) {
			missedMovie = missedMovie.substring(0, 40);
			missedMovie += '...';
		}
		
		$(this).css('color', '#666');
		
		// Remove one life
		changeLife(-34, missedMovie);
	}
	
	$(this).parent().children().css({'opacity': 0});
	// Mark completed
	$('#movie' + game.currentMovie.order).addClass('marked');
	
});

$('#editcontent').live('click', function() {
	$(this).html('save').addClass('save2local').css('top', '3px');
	$('h4').replaceWith('<input type="text" name="nametag" value="" placeholder="' + $('h4').text() + '" class="nametag-input" />');
	$('.nametag-input').focus();
});

$('.save2local').live('click', function() {
	if ($('.nametag-input').val() !== '') {
		amplify.store('nametag', $('.nametag-input').val() );
		$('#nametag').html( $('.nametag-input').val() );
		$(this).removeClass('save2local').css('top', '-7px').html('edit');
		$('.nametag-input').replaceWith('<h4>' + $('.nametag-input').val() + '</h4>');
		
	}else {
		$(this).removeClass('save2local').css('top', '-7px').html('edit');
		$('.nametag-input').replaceWith('<h4>' + amplify.store().nametag + '</h4>');
	}
});

// Reset highscore
$('#delete').bind('click', function() {
	// Confirm
	$(this).addClass('confirmDelete');
});
$('.confirmDelete').bind('click', function() {
	$(this).removeClass('confirmDelete');
	// Highscore reset
	amplify.store( 'highscore', [{score: 0, tag: 'This could be you!'}, {score: 0, tag: 'This could be you!'}, {score: 0, tag: 'This could be you!'}] );
});

// PLUGINS
// jQUERY Preloader
(function(d){var h=[];d.loadImages=function(a,e){"string"==typeof a&&(a=[a]);for(var f=a.length,g=0,b=0;b<f;b++){var c=document.createElement("img");c.onload=function(){g++;g==f&&d.isFunction(e)&&e()};c.src=a[b];h.push(c)}}})(jQuery);