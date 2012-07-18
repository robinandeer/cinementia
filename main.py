from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
import os, random
import json
from xml.sax import saxutils
from google.appengine.ext.webapp import template
from lxml import etree as ElementTree
from random import choice, sample

class Box():
	"""Container for all information per Ajax request."""
	def __init__(self, amountToDisp, totalAmount, startFrom):
		self.amountToDisp = amountToDisp
		self.totalAmount = totalAmount
		self.startFrom = startFrom
		self.randomMovies = []
		self.movieList = []
	
class Movie:
	"""Holds a single movie to be sent to the client."""
	def __init__(self, title, imdb, genre, country, frame, count, alts):
	    # These values are created
	    # when the class is instantiated.
		self.title = title
		self.imdb = imdb
		self.genre = genre
		self.country = country
		self.frame = frame
		self.count = count
		self.alts = alts

class Alts:
	"""Holds three alternatives for each movie."""
	def __init__(self, title, imdb):
		self.title = title
		self.imdb = imdb

class MainPage(webapp.RequestHandler):
    def get(self):		
		q = 'index.html'
		path = os.path.join(os.path.dirname (__file__), q)
		self.response.headers ['Content-Type'] = 'text/html'
		self.response.out.write (template.render (path, {}))

class Ajax(webapp.RequestHandler):
	def get(self):
		path = os.path.join(os.path.dirname (__file__), 'db.xml')
		parsed = ElementTree.parse(path)
		
		# Set up a container for basic information:
		# => Amount to disp, total amount
		box = Box( 	int(self.request.get('amount')), \
					int(parsed.findtext('total_count')), \
					int(self.request.get('lastMovie'))+1 ) # Find out which is the last movie right now
		
		# Select random movies 
		box.randomMovies = random.sample(xrange(0,box.totalAmount+1), box.amountToDisp)
		
		# Get a list of movies
		getMovies(parsed, box)
		
		comboList = []
		list = []
		imgs = []
		# Generate random list to lay out choices
		choices = range(1,5)
		for movie, numID in zip(box.movieList, box.randomMovies):
			# Shuffle movie alternatives
			random.shuffle(choices)
			# Make up the choice li's
			altLi = ''
			for cho in choices:
				if cho == 4:
					altLi += '<li style="background-image: url(img/title_thumb/'+ movie.imdb +'.png)" title="'+ movie.title +'" class="correct"><p class="title-help">'+ movie.title +'</p></li>'
				else:
					altLi += '<li style="background-image: url(img/title_thumb/'+ movie.alts[cho-1].imdb +'.png)" title="'+ movie.alts[cho-1].title +'"><p class="title-help">'+ movie.alts[cho-1].title +'</p></li></li>'

			comboList.append('\
			<div class="wrapper qd" id="movie'+ str(movie.count) +'"> \
				<div class="item"> \
					<div class="front"> \
						<img src="img/'+ movie.frame +'/'+ movie.imdb +'.jpg" class="movie_guess"> \
						<ul class="choices">'+ altLi +'</ul> \
					</div> \
					<div style="background: url(img/title/'+ movie.imdb +'.png)" class="titleimg"></div> \
				</div> \
			</div>')
			
			imgs += ['img/title/' + movie.imdb + '.png', 'img/' + movie.frame + '/' + movie.imdb + '.jpg']
			
			if movie.frame == 'easy':
				difficulty = 10
			elif movie.frame == 'medi':
				difficulty = 20
			else:
				difficulty = 30
			
			list.append({'title': movie.title, 'id': movie.imdb, 'genre': movie.genre, 'country': movie.country, 'frame': difficulty, 'order': movie.count, 'numID': numID})
		
		# Reverse and join combo for proper output
		comboList.reverse()
		comboString = ''.join(comboList)
		results = {'html': comboString, 'movies': list, 'imgs': imgs}
		
		self.response.headers ['Content-Type'] = 'application/json'
		self.response.out.write(json.dumps(results))
		
def findMoviesByYear(db, start, stop):
	saved = []
	for i in range(start, stop, 1):
		temp = db.findall('.//*[@year="'+str(i)+'"]')
		if temp != []:
			saved += temp
	return saved

# FOR ALTS
def findMoviesByGenre(db, answerGenre):
	saved = db.findall('.//*[@genre="'+ answerGenre +'"]')
	return saved

def getMovies(db, box):
	movieList = []
	counter = 0
	# Get and fill in each movie friom db
	for number in box.randomMovies:
		temp = db.find('mov'+str(number))
		box.movieList.append(Movie( saxutils.unescape(temp.get('title')), \
									temp.get('id'), \
									temp.get('genre'), \
									temp.get('country'), \
									getLevel(box, temp), \
									box.startFrom+counter, \
									getAlt(db, box, temp.get('id'), temp.get('genre')) ))
		counter += 1

	return None

def getAlt(db, box, answerID, answerGenre):
	
	# List with all movies of the same genre
	completeList = findMoviesByGenre(db, answerGenre)
	
	# Pick out 4 random alternatives (elements) - one extra if the answer is included!
	altList = sample(completeList, 4)
	
	# Cut out titles and id's - and make sure to exclude the answer
	alts = []
	count = 0
	for alt in altList:
		if count == 3:
			break
		else:
			if alt.get('id') != answerID:
				alts += [Alts( saxutils.unescape(alt.get('title')), alt.get('id') )]
				count += 1
			else:
				continue
		
	return alts
	
def getLevel(box, movie):
	# Check which levels exist for each selected movie and choose randomly
	available = int(movie.get('easy')) + int(movie.get('medi'))*3 + int(movie.get('hard'))*5
	
	if available == 1:
		frame = 'easy'
	elif available == 3:
		frame = 'medi'
	elif available == 5:
		frame = 'hard'
	# easy + medi
	elif available == 4:
		frame = choice(['easy','medi'])
	# easy + hard
	elif available == 6:
		frame = choice(['easy','hard'])
	# medi + hard
	elif available == 8:
		frame = choice(['medi','hard'])
	# easy + medi + hard
	elif available == 9:
		frame = choice(['easy', 'medi','hard'])
		
	return frame

application = webapp.WSGIApplication([
  ('/', MainPage),
  ('/addmore', Ajax),
], debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()