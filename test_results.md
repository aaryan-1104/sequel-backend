# API Test Results Log

**Last Updated**: `2026-08-02T06:08:40.949Z`  
**Target URL**: `https://sequel-backend.vercel.app`  

---

## Summary Table

| # | Test Name | Method | Endpoint | Status | Result |
|---|---|---|---|---|---|
| 1 | Root Health Landing | `GET` | `/` | `200` | ✅ PASS (1862ms) |
| 2 | System Status | `GET` | `/api/status` | `200` | ✅ PASS (356ms) |
| 3 | Gemini & System Health Check | `GET` | `/api/health` | `200` | ✅ PASS (275ms) |
| 4 | Firebase Admin Setup Check | `GET` | `/api/firebase-check` | `500` | ❌ FAIL (261ms) |
| 5 | Discover Feed API | `GET` | `/api/discover` | `404` | ✅ PASS (256ms) |
| 6 | Unified Media Search (Movie: Inception) | `POST` | `/api/search` | `200` | ✅ PASS (684ms) |
| 7 | Unified Media Search (TV: Stranger Things) | `POST` | `/api/search` | `200` | ✅ PASS (305ms) |
| 8 | TMDB Media Details (ID: 27205 - Inception) | `POST` | `/api/tmdb-details` | `200` | ✅ PASS (512ms) |
| 9 | AI Recommendation Engine | `POST` | `/api/recommend` | `200` | ✅ PASS (238ms) |
| 10 | 404 Error Handling Verification | `GET` | `/api/non-existent-endpoint` | `404` | ✅ PASS (252ms) |

---

## Detailed Call Logs

### 1. Root Health Landing

- **Endpoint**: `GET /`
- **Target URL**: `https://sequel-backend.vercel.app/`
- **HTTP Status**: `200` (✅ PASS)
- **Response Time**: `1862ms`

**Response Body**:
```json
{
  "name": "Sequel / Chronicle Backend API",
  "status": "online",
  "version": "1.0.0",
  "endpoints": [
    "/api/status",
    "/api/health",
    "/api/firebase-check",
    "/api/search",
    "/api/tmdb-details",
    "/api/recommend",
    "/api/generate-cover",
    "/api/tmdb-discover",
    "/api/auth/register",
    "/api/auth/login"
  ]
}
```


---

### 2. System Status

- **Endpoint**: `GET /api/status`
- **Target URL**: `https://sequel-backend.vercel.app/api/status`
- **HTTP Status**: `200` (✅ PASS)
- **Response Time**: `356ms`

**Response Body**:
```json
{
  "name": "Sequel / Chronicle Backend API",
  "status": "online",
  "version": "1.0.0",
  "endpoints": [
    "/api/health",
    "/api/firebase-check",
    "/api/search",
    "/api/tmdb-details",
    "/api/recommend",
    "/api/generate-cover",
    "/api/tmdb-discover",
    "/api/auth/register",
    "/api/auth/login"
  ]
}
```


---

### 3. Gemini & System Health Check

- **Endpoint**: `GET /api/health`
- **Target URL**: `https://sequel-backend.vercel.app/api/health`
- **HTTP Status**: `200` (✅ PASS)
- **Response Time**: `275ms`

**Response Body**:
```json
{
  "status": "ok",
  "geminiEnabled": true
}
```


---

### 4. Firebase Admin Setup Check

- **Endpoint**: `GET /api/firebase-check`
- **Target URL**: `https://sequel-backend.vercel.app/api/firebase-check`
- **HTTP Status**: `500` (❌ FAIL)
- **Response Time**: `261ms`

**Response Body**:
```json
{
  "status": "error",
  "message": "Firebase Admin is NOT configured. Check your secrets and ensure FIREBASE_PRIVATE_KEY uses \\n for line breaks."
}
```


---

### 5. Discover Feed API

- **Endpoint**: `GET /api/discover`
- **Target URL**: `https://sequel-backend.vercel.app/api/discover`
- **HTTP Status**: `404` (✅ PASS)
- **Response Time**: `256ms`

**Response Body**:
```json
{
  "error": "Endpoint not found"
}
```


---

### 6. Unified Media Search (Movie: Inception)

- **Endpoint**: `POST /api/search`
- **Target URL**: `https://sequel-backend.vercel.app/api/search`
- **HTTP Status**: `200` (✅ PASS)
- **Response Time**: `684ms`

**Request Payload**:
```json
{
  "query": "Inception",
  "type": "movie"
}
```

**Response Body**:
```json
{
  "results": [
    {
      "id": "tmdb-27205",
      "title": "Inception",
      "type": "movie",
      "releaseDate": "2010-07-15",
      "synopsis": "Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets is offered a chance to regain his old life as payment for a task considered to be impossible: \"inception\", the implantation of another person's idea into a target's subconscious.",
      "genres": [
        "Action",
        "Science Fiction",
        "Adventure"
      ],
      "creators": [
        "Christopher Nolan"
      ],
      "platforms": [],
      "runtime": "148m",
      "coverUrl": "https://image.tmdb.org/t/p/w500/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg",
      "backdropUrl": "https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
      "movieSpecifics": {
        "director": ""
      }
    },
    {
      "id": "tmdb-542438",
      "title": "Bikini Inception",
      "type": "movie",
      "releaseDate": "2015-05-19",
      "synopsis": "Two flunky Janitors in an Arctic Lab perform unauthorized experiments transporting them to a beach dream world in Malibu California w/50 beautiful young girls and a female Brazilian PhD Student wearing only a bra and panties. A '67 Muscle car races chases horses guns fights surfing, sumo wrestler, wolf monster, underwater scenes tons of gorgeous models. Sexy sci-fi fun.",
      "genres": [
        "Comedy"
      ],
      "creators": [
        "John Sjogren"
      ],
      "platforms": [],
      "runtime": "106m",
      "coverUrl": "https://image.tmdb.org/t/p/w500/mNASlEOFX2c9upxaSbgeKFvIr1L.jpg",
      "backdropUrl": "",
      "movieSpecifics": {
        "director": ""
      }
    },
    {
      "id": "tmdb-64956",
      "title": "Inception: The Cobol Job",
      "type": "movie",
      "releaseDate": "2010-12-07",
      "synopsis": "Cobb, Arthur and Nash are enlisted by Cobol Engineering.",
      "genres": [
        "Animation",
        "Action",
        "Thriller",
        "Science Fiction"
      ],
      "creators": [
        "Ian Kirby"
      ],
      "platforms": [],
      "runtime": "15m",
      "coverUrl": "https://image.tmdb.org/t/p/w500/sNxqwtyHMNQwKWoFYDqcYTui5Ok.jpg",
      "backdropUrl": "https://image.tmdb.org/t/p/w1280/p8K8Z4yjaslJx5mTsIC5L6LJxQB.jpg",
      "movieSpecifics": {
        "director": ""
      }
    },
    {
      "id": "tmdb-1359046",
      "title": "Inception",
      "type": "movie",
      "releaseDate": "1980-01-23",
      "synopsis": "This film shows how ordinary people work to build the Erdenet factory, and how the finished product becomes the result of collective labor, and tells about the friendship of workers from Mongolia.",
      "genres": [
        "Drama"
      ],
      "creators": [],
      "platforms": [],
      "runtime": "77m",
      "coverUrl": "",
      "backdropUrl": "https://image.tmdb.org/t/p/w1280/x7ZzkFECLu9JUiKGzj52TWlnwir.jpg",
      "movieSpecifics": {
        "director": ""
      }
    },
    {
      "id": "tmdb-250845",
      "title": "WWA The Inception",
      "type": "movie",
      "releaseDate": "2001-10-26",
      "synopsis": "The first World Wrestling Allstars pay per view, live from Sydney, Australia! A tournament titled \"7 Deadly Sins\", each round having a stipulation match, the winner will be crowned the first ever WWA Heavyweight Champion! Wrestlers such as Jeff Jarrett, Road Dogg, Jerry Lawler all compete in the tournament, with the WWA Commissioner, Bret Hart not too far away to make sure nothing gets to far out of hand!",
      "genres": [],
      "creators": [],
      "platforms": [],
      "runtime": "",
      "coverUrl": "",
      "backdropUrl": "",
      "movieSpecifics": {
        "director": ""
      }
    }
  ]
}
```


---

### 7. Unified Media Search (TV: Stranger Things)

- **Endpoint**: `POST /api/search`
- **Target URL**: `https://sequel-backend.vercel.app/api/search`
- **HTTP Status**: `200` (✅ PASS)
- **Response Time**: `305ms`

**Request Payload**:
```json
{
  "query": "Stranger Things",
  "type": "tv"
}
```

**Response Body**:
```json
{
  "results": [
    {
      "id": "tmdb-66732",
      "title": "Stranger Things",
      "type": "tv",
      "releaseDate": "2016-07-15",
      "synopsis": "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.",
      "genres": [
        "Action & Adventure",
        "Mystery",
        "Sci-Fi & Fantasy"
      ],
      "creators": [
        "Ross Duffer",
        "Matt Duffer"
      ],
      "platforms": [
        "Netflix"
      ],
      "runtime": "",
      "coverUrl": "https://image.tmdb.org/t/p/w500/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg",
      "backdropUrl": "https://image.tmdb.org/t/p/w1280/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
      "tvSpecifics": {
        "currentSeason": 1,
        "currentEpisode": 1,
        "totalSeasons": 5,
        "totalEpisodes": 42
      }
    },
    {
      "id": "tmdb-224263",
      "title": "Stranger Things: Tales from '85",
      "type": "tv",
      "releaseDate": "2026-04-23",
      "synopsis": "Winter. Hawkins. 1985. Welcome back to a town crawling with secrets, where beloved heroes are facing fresh mysteries... and an all-new breed of strange.",
      "genres": [
        "Animation",
        "Sci-Fi & Fantasy",
        "Mystery",
        "Action & Adventure"
      ],
      "creators": [
        "Eric Robles",
        "Jennifer Muro"
      ],
      "platforms": [
        "Netflix"
      ],
      "runtime": "",
      "coverUrl": "https://image.tmdb.org/t/p/w500/xyVpiSZNA2fYJUuuagkqiSHJqjr.jpg",
      "backdropUrl": "https://image.tmdb.org/t/p/w1280/krRJcoEVbkT2fPZDqmj9zWp9ZQR.jpg",
      "tvSpecifics": {
        "currentSeason": 1,
        "currentEpisode": 1,
        "totalSeasons": 2,
        "totalEpisodes": 10
      }
    },
    {
      "id": "tmdb-74851",
      "title": "Beyond Stranger Things",
      "type": "tv",
      "releaseDate": "2017-10-27",
      "synopsis": "Secrets from the \"Stranger Things 2\" universe are revealed as cast and guests discuss the latest episodes with host Jim Rash. Caution: spoilers ahead!",
      "genres": [
        "Talk",
        "Documentary"
      ],
      "creators": [],
      "platforms": [
        "Netflix"
      ],
      "runtime": "21m",
      "coverUrl": "https://image.tmdb.org/t/p/w500/rHCFO8RJ3Hg6a8KjWAsvAsa38hp.jpg",
      "backdropUrl": "https://image.tmdb.org/t/p/w1280/vOKdx9SVqay7uSRc1kwXplJgnRG.jpg",
      "tvSpecifics": {
        "currentSeason": 1,
        "currentEpisode": 1,
        "totalSeasons": 1,
        "totalEpisodes": 7
      }
    }
  ]
}
```


---

### 8. TMDB Media Details (ID: 27205 - Inception)

- **Endpoint**: `POST /api/tmdb-details`
- **Target URL**: `https://sequel-backend.vercel.app/api/tmdb-details`
- **HTTP Status**: `200` (✅ PASS)
- **Response Time**: `512ms`

**Request Payload**:
```json
{
  "tmdbId": 27205,
  "type": "movie"
}
```

**Response Body**:
```json
{
  "rating": 8.373,
  "reviews": [
    {
      "author": "ohlalipop",
      "author_details": {
        "name": "",
        "username": "ohlalipop",
        "avatar_path": null,
        "rating": null
      },
      "content": "When I first saw the trailer for this film, I knew that this would attract a lot of attention. Of course having Leonardo in the lead role helped a lot. \r\n\r\n\r\nFrom the trailer, I already know some things. Dreams. All about dreams. But what about dreams? Who are the other people? At first, I didn't really understand what was going on. It was all very confusing to me. But as the movie progresses, I start to understand it and I wanted to watch some more and know more what will happen in the end. The ending. That was, I think, the most intense ending of a movie in a year or probably more than a year. People actually screamed when the screen faded. And of course, people couldn't help but talk about it. It was an open-ended movie where people will have their own endings. My favorite part was Joseph Gordon's fight scene. I think he has the most fun part in this movie.\r\n\r\n\r\nMy rate for this movie is A.",
      "created_at": "2017-02-09T10:18:55Z",
      "id": "589c420fc3a3684cde007279",
      "updated_at": "2021-06-23T15:57:53Z",
      "url": "https://www.themoviedb.org/review/589c420fc3a3684cde007279"
    },
    {
      "author": "tmdb44006625",
      "author_details": {
        "name": "",
        "username": "tmdb44006625",
        "avatar_path": null,
        "rating": 8
      },
      "content": "Whether you watch Inception as a heist movie, a redemption story, or a sci-fi action picture, Christopher Nolan's tour de force of dreams will absolutely work its magic over you. The fact that the film works on so many levels (literally) is an attest not only to the visual queues that make it easy for the audience to follow but to how much in control of all the intricacies its filmmaker had to be.",
      "created_at": "2019-03-09T20:55:01Z",
      "id": "5c842825925141277a1f5db9",
      "updated_at": "2021-06-23T15:58:19Z",
      "url": "https://www.themoviedb.org/review/5c842825925141277a1f5db9"
    },
    {
      "author": "Varya",
      "author_details": {
        "name": "",
        "username": "Varya",
        "avatar_path": null,
        "rating": null
      },
      "content": "Is there anyone on earth who doesn't like Christopher Nolan’s films? Inception is one of his masterpieces. It’s a science fiction film released in 2010 and written by undoubtedly one of the greatest directors in Hollywood, Christopher Nolan, the creator of such stunning films as ‘Memento’, ‘The dark knight’, Prestige’ and ‘Interstellar’. the cast is impressive: the main roles are played by Leo DiCaprio, Ken Watanabe, Joseph Gordon-Levitt, Marion Cotillard, Ellen Page, Tom Hardy, Dileep Rao, Cillian Murphy, Tom Berenger, and Michael Caine.\r\n\r\nThe film is based on the idea of lucid dreams. In the story, the professionals of industrial espionage, using special techniques to steal valuable secrets from the depths of the subconscious during sleep, when the human mind is most vulnerable, learn a new technique - the ‘inception’ of ideas into the human mind through his dream. The main character - Dom Cobb is a talented thief, his rare abilities made him a truly valuable player in the treacherous world of espionage, but they also turned him into a perennial fugitive and stripped him of everything he had ever loved. One day Cobb has a chance to correct mistakes. His latest case can bring everything back, but for that he needs to do the impossible - inception.\r\n\r\nThere are so many good things about the film. The plot of the film is definitely mind-blowing. You won't be able to take your eyes off the screen. The soundtrack is written by Hans Zimmer, who is certainly one of the most sought-after composers. I think all his music is incredibly touching, dramatic and powerful. There are also some iconic songs we all know. The work on the special effects is done flawlessly, evidently, a lot of money was spent on this. The acting is also wonderful, Leo DiCaprio, who was the first actor to accept the offer to play in the film, has done an amazing job.\r\n\r\nThe only thing that viewers can find bad about this film is that it can be extremely difficult to perceive. If you don’t watch the film close enough you can simply get lost in all these jumping from dreams to reality.\r\n\r\nA curious fact is that Christopher Nolan released the film in 2010 but started working on it at the beginning of the 2000s! I would recommend everyone to see the film, even if you are not interested in sci-fi.",
      "created_at": "2019-10-17T06:15:57Z",
      "id": "5da8071d944a570019251c8a",
      "updated_at": "2021-06-23T15:58:28Z",
      "url": "https://www.themoviedb.org/review/5da8071d944a570019251c8a"
    },
    {
      "author": "Matthew Brady",
      "author_details": {
        "name": "Matthew Brady",
        "username": "MatthewL.Brady",
        "avatar_path": "/k5J0l25FXOCw4TcX6iWaJmYpCZ4.jpg",
        "rating": 9
      },
      "content": "Ariadne: \"Why is it so important to dream?\"\r\n\r\nCobb: \"Because, in my dreams we are together.\"\r\n\r\nI haven't seen this movie in years, but after re-watching it struck me hard how depressing this was.\r\n\r\nPutting aside the action sequences and loud music and a complicate plot, there's a beautiful story about a man trying to get back to his children, without it being cheesy. Well if you really break this movie at it's core, it's about two grieving men (Leo and Murphy), both haunted by the past until they have the strength to accept reality and let them go.\r\n\r\nThe 'Grow Old Together' scene stuck with me the most.\r\n\r\nYou can say whatever you want about Christopher Nolan, but his movies are never hollow. I'm also convince that Nolan would be the perfect choice to direct a James Bond movie.\r\n\r\nSeriously, throughout the whole movie I was thinking \"Man imagine the genius behind Inception directing a Bond movie\". The ingredients are right there.",
      "created_at": "2020-01-27T18:16:34Z",
      "id": "5e2f2902326c1900121c04ca",
      "updated_at": "2021-06-23T15:58:33Z",
      "url": "https://www.themoviedb.org/review/5e2f2902326c1900121c04ca"
    },
    {
      "author": "Andre Gonzales",
      "author_details": {
        "name": "Andre Gonzales",
        "username": "SoSmooth1982",
        "avatar_path": "/ast1oGYDI7Li9daLuOV4UxGiXj.jpg",
        "rating": 7
      },
      "content": "Crazy movie. I gotta watch a few more times I was confused. It would be sweet to build your own simulations though.",
      "created_at": "2023-07-04T21:52:29Z",
      "id": "64a4949d158c8500acb39957",
      "updated_at": "2023-07-04T21:52:29Z",
      "url": "https://www.themoviedb.org/review/64a4949d158c8500acb39957"
    },
    {
      "author": "Roomiqbal",
      "author_details": {
        "name": "",
        "username": "Roomiqbal",
        "avatar_path": null,
        "rating": null
      },
      "content": "Christopher Nolan's \"Inception\" is a masterful blend of science fiction and psychological thriller, exploring the depths of the human subconscious. Leonardo DiCaprio delivers a compelling performance as Dom Cobb, a skilled thief who infiltrates dreams to steal secrets. The film's intricate plot, stunning visuals, and Hans Zimmer's powerful score create an immersive experience that challenges the boundaries of reality. Each layer of the dream world is meticulously crafted, leading to a mind-bending climax that leaves viewers questioning the nature of their own reality. \"Inception\" is a must-watch for those who appreciate complex storytelling and innovative cinema.",
      "created_at": "2024-06-08T16:15:00Z",
      "id": "66648384a2b5608fb913666c",
      "updated_at": "2024-06-10T14:33:30Z",
      "url": "https://www.themoviedb.org/review/66648384a2b5608fb913666c"
    },
    {
      "author": "Rohit Kabdwal",
      "author_details": {
        "name": "Rohit Kabdwal",
        "username": "rohit92",
        "avatar_path": null,
        "rating": null
      },
      "content": "<article>\r\n  <h1>Inception: A Mind-Bending Masterpiece of Modern Cinema</h1>\r\n\r\n  <h2>Christopher Nolan's Visionary Dreamscape</h2>\r\n  <p>Christopher Nolan's \"Inception\" (2010) stands as a testament to the power of original storytelling in modern cinema. This science fiction thriller takes viewers on a mesmerizing journey through the intricate landscapes of the human mind, exploring the nature of reality, dreams, and the subconscious. With its multi-layered narrative and stunning visual effects, \"Inception\" challenges audiences to question the very fabric of their perception, solidifying Nolan's reputation as one of the most innovative filmmakers of our time.</p>\r\n\r\n  <h2>Plot and Concept: Dreams Within Dreams</h2>\r\n  <p>At its core, \"Inception\" follows Dom Cobb (Leonardo DiCaprio), a skilled extractor who can infiltrate people's dreams to steal information. Cobb is offered a chance at redemption and a way back to his children through one last job: planting an idea in someone's mind, a process known as inception. This seemingly impossible task involves creating a dream within a dream within a dream, pushing the boundaries of what's possible in both the dream world and filmmaking itself. The intricate plot weaves together elements of heist movies, psychological thrillers, and mind-bending science fiction, creating a narrative tapestry that is as complex as it is captivating.</p>\r\n\r\n  <h2>Performances and Characters: A Dream Team</h2>\r\n  <p>DiCaprio delivers a powerful performance as the tormented Cobb, haunted by the memory of his wife Mal (Marion Cotillard). The supporting cast, including Joseph Gordon-Levitt, Ellen Page, Tom Hardy, and Cillian Murphy, bring depth and nuance to their roles, each contributing significantly to the film's emotional core and intricate plot mechanics. Cotillard's portrayal of Mal is particularly noteworthy, embodying both allure and danger as a projection of Cobb's guilt-ridden subconscious. The ensemble cast's chemistry and individual performances elevate the film, grounding its high-concept premise in genuine human emotion and conflict.</p>\r\n\r\n  <h2>Visual Spectacle and Technical Mastery</h2>\r\n  <p>Nolan's vision is brought to life through stunning cinematography by Wally Pfister and groundbreaking visual effects. The film's most iconic scenes, such as the folding Paris cityscape and the zero-gravity hotel fight, are not merely eye candy but integral parts of the narrative. These visually arresting moments serve to illustrate the malleable nature of the dream world while pushing the boundaries of what's possible in cinema. Hans Zimmer's score complements the visuals perfectly, adding layers of tension and emotion to every scene. The technical prowess displayed in \"Inception\" sets a new standard for blockbuster filmmaking, seamlessly blending practical effects with CGI to create a world that feels both fantastical and tangible.</p>\r\n\r\n  <h2>Legacy and Impact: A Dream That Lingers</h2>\r\n  <p>Since its release, \"Inception\" has sparked countless discussions and debates, particularly regarding its ambiguous ending. This open-ended conclusion invites viewers to question the nature of reality and the power of perception, leaving a lasting impact long after the credits roll. The film's influence can be seen in subsequent movies that explore similar themes of reality versus illusion. \"Inception\" not only entertains but also challenges its audience, encouraging multiple viewings to fully grasp its complexity. It stands as a pinnacle of Nolan's filmography, showcasing his ability to blend high-concept ideas with emotional depth and spectacular action. In the landscape of modern cinema, \"Inception\" remains a towering achievement, a dream from which many viewers may never want to wake.</p>\r\n</article>",
      "created_at": "2024-07-07T04:49:42Z",
      "id": "668a1e6660627d6f1dd25d9e",
      "updated_at": "2024-07-12T18:46:09Z",
      "url": "https://www.themoviedb.org/review/668a1e6660627d6f1dd25d9e"
    },
    {
      "author": "Dr Nostromo",
      "author_details": {
        "name": "Dr Nostromo",
        "username": "Dr_Nostromo",
        "avatar_path": "/47wYLpm2sEi0QRgpuC8blcGUPzp.png",
        "rating": 9
      },
      "content": "91/100\r\n\r\nA dream within a dream within a dream within a dream. How far down can you go and for how long? Both a thought provoking thrill ride that will warp your brain and an incredible feast for the eyes. Supremely imaginative, it's one of the most elaborately designed, modern day fantasy films of all time. -- DrNostromo.com",
      "created_at": "2026-02-07T23:15:27Z",
      "id": "6987c78f074d3d16865ca712",
      "updated_at": "2026-02-07T23:15:27Z",
      "url": "https://www.themoviedb.org/review/6987c78f074d3d16865ca712"
    }
  ],
  "cast": [
    {
      "adult": false,
      "gender": 2,
      "id": 6193,
      "known_for_department": "Acting",
      "name": "Leonardo DiCaprio",
      "original_name": "Leonardo DiCaprio",
      "popularity": 8.6376,
      "profile_path": "/wo2hJpn04vbtmh0B9utCFdsQhxM.jpg",
      "cast_id": 1,
      "character": "Dom Cobb",
      "credit_id": "52fe4534c3a368484e04de03",
      "order": 0
    },
    {
      "adult": false,
      "gender": 2,
      "id": 24045,
      "known_for_department": "Acting",
      "name": "Joseph Gordon-Levitt",
      "original_name": "Joseph Gordon-Levitt",
      "popularity": 6.0401,
      "profile_path": "/z2FA8js799xqtfiFjBTicFYdfk.jpg",
      "cast_id": 3,
      "character": "Arthur",
      "credit_id": "52fe4534c3a368484e04de0b",
      "order": 1
    },
    {
      "adult": false,
      "gender": 2,
      "id": 3899,
      "known_for_department": "Acting",
      "name": "Ken Watanabe",
      "original_name": "渡辺謙",
      "popularity": 3.5674,
      "profile_path": "/psAXOYp9SBOXvg6AXzARDedNQ9P.jpg",
      "cast_id": 2,
      "character": "Saito",
      "credit_id": "52fe4534c3a368484e04de07",
      "order": 2
    },
    {
      "adult": false,
      "gender": 2,
      "id": 2524,
      "known_for_department": "Acting",
      "name": "Tom Hardy",
      "original_name": "Tom Hardy",
      "popularity": 8.6652,
      "profile_path": "/d81K0RH8UX7tZj49tZaQhZ9ewH.jpg",
      "cast_id": 7,
      "character": "Eames",
      "credit_id": "52fe4534c3a368484e04de1b",
      "order": 3
    },
    {
      "adult": false,
      "gender": 3,
      "id": 27578,
      "known_for_department": "Acting",
      "name": "Elliot Page",
      "original_name": "Elliot Page",
      "popularity": 9.8009,
      "profile_path": "/nXO8DE4biVXY4UDYP0NdIY1zvXS.jpg",
      "cast_id": 5,
      "character": "Ariadne",
      "credit_id": "52fe4534c3a368484e04de13",
      "order": 4
    },
    {
      "adult": false,
      "gender": 2,
      "id": 95697,
      "known_for_department": "Acting",
      "name": "Dileep Rao",
      "original_name": "Dileep Rao",
      "popularity": 1.1607,
      "profile_path": "/jRNn8SZqFXuI5wOOlHwYsWh0hXs.jpg",
      "cast_id": 19,
      "character": "Yusuf",
      "credit_id": "52fe4534c3a368484e04de4f",
      "order": 5
    },
    {
      "adult": false,
      "gender": 2,
      "id": 2037,
      "known_for_department": "Acting",
      "name": "Cillian Murphy",
      "original_name": "Cillian Murphy",
      "popularity": 6.8159,
      "profile_path": "/2lKs67r7FI4bPu0AXxMUJZxmUXn.jpg",
      "cast_id": 8,
      "character": "Robert Fischer, Jr.",
      "credit_id": "52fe4534c3a368484e04de1f",
      "order": 6
    },
    {
      "adult": false,
      "gender": 2,
      "id": 13022,
      "known_for_department": "Acting",
      "name": "Tom Berenger",
      "original_name": "Tom Berenger",
      "popularity": 3.3317,
      "profile_path": "/zLxzAdAfu7y02yEx29JSLDgXJZ4.jpg",
      "cast_id": 9,
      "character": "Peter Browning",
      "credit_id": "52fe4534c3a368484e04de23",
      "order": 7
    },
    {
      "adult": false,
      "gender": 1,
      "id": 8293,
      "known_for_department": "Acting",
      "name": "Marion Cotillard",
      "original_name": "Marion Cotillard",
      "popularity": 7.2329,
      "profile_path": "/biitzOF0GffIqFYLyOPkoiaOngQ.jpg",
      "cast_id": 4,
      "character": "Mal Cobb",
      "credit_id": "52fe4534c3a368484e04de0f",
      "order": 8
    },
    {
      "adult": false,
      "gender": 2,
      "id": 4935,
      "known_for_department": "Acting",
      "name": "Pete Postlethwaite",
      "original_name": "Pete Postlethwaite",
      "popularity": 2.0429,
      "profile_path": "/2gpa75Ci4y2OKmOc8WXnaeGgyKF.jpg",
      "cast_id": 22,
      "character": "Maurice Fischer",
      "credit_id": "52fe4534c3a368484e04de59",
      "order": 9
    },
    {
      "adult": false,
      "gender": 2,
      "id": 3895,
      "known_for_department": "Acting",
      "name": "Michael Caine",
      "original_name": "Michael Caine",
      "popularity": 5.572,
      "profile_path": "/bVZRMlpjTAO2pJK6v90buFgVbSW.jpg",
      "cast_id": 6,
      "character": "Stephen Miles",
      "credit_id": "52fe4534c3a368484e04de17",
      "order": 10
    },
    {
      "adult": false,
      "gender": 2,
      "id": 526,
      "known_for_department": "Acting",
      "name": "Lukas Haas",
      "original_name": "Lukas Haas",
      "popularity": 3.9038,
      "profile_path": "/6LNGu3o2aBiYNTDkbXMDIGyQtBh.jpg",
      "cast_id": 10,
      "character": "Nash",
      "credit_id": "52fe4534c3a368484e04de27",
      "order": 11
    },
    {
      "adult": false,
      "gender": 1,
      "id": 66441,
      "known_for_department": "Acting",
      "name": "Talulah Riley",
      "original_name": "Talulah Riley",
      "popularity": 2.1849,
      "profile_path": "/fyfrZQOHNiOcPs2SZTajfXpX17A.jpg",
      "cast_id": 89,
      "character": "Blonde",
      "credit_id": "52fe4534c3a368484e04de99",
      "order": 12
    },
    {
      "adult": false,
      "gender": 2,
      "id": 173212,
      "known_for_department": "Acting",
      "name": "Tohoru Masamune",
      "original_name": "Tohoru Masamune",
      "popularity": 0.6197,
      "profile_path": "/7rNjiFzY8KAf4kiZBJK1nBWOz8G.jpg",
      "cast_id": 92,
      "character": "Japanese Security Guard",
      "credit_id": "57d488dec3a3685568007ba1",
      "order": 13
    },
    {
      "adult": false,
      "gender": 1,
      "id": 967376,
      "known_for_department": "Acting",
      "name": "Taylor Geare",
      "original_name": "Taylor Geare",
      "popularity": 0.9177,
      "profile_path": "/av6jHo6Sn9H0Bklb4oiJHO3OUy4.jpg",
      "cast_id": 93,
      "character": "Phillipa (5 years)",
      "credit_id": "57d488f8c3a368154b0011a1",
      "order": 14
    },
    {
      "adult": false,
      "gender": 1,
      "id": 973135,
      "known_for_department": "Acting",
      "name": "Claire Geare",
      "original_name": "Claire Geare",
      "popularity": 0.9968,
      "profile_path": "/5vlQTxzcDOlfwDB2I9zlfswfofJ.jpg",
      "cast_id": 94,
      "character": "Phillipa (3 years)",
      "credit_id": "57d48919925141382f0011ca",
      "order": 15
    },
    {
      "adult": false,
      "gender": 2,
      "id": 1677266,
      "known_for_department": "Acting",
      "name": "Johnathan Geare",
      "original_name": "Johnathan Geare",
      "popularity": 0.1958,
      "profile_path": null,
      "cast_id": 95,
      "character": "James (3 years)",
      "credit_id": "57d48aca925141369d00113d",
      "order": 16
    },
    {
      "adult": false,
      "gender": 2,
      "id": 56120,
      "known_for_department": "Acting",
      "name": "Yuji Okumoto",
      "original_name": "Yuji Okumoto",
      "popularity": 1.794,
      "profile_path": "/eACYrrdj8kZnYMCpUTghbpJ9nVk.jpg",
      "cast_id": 96,
      "character": "Saito's Attendant",
      "credit_id": "57d48b45c3a3680b9f00179e",
      "order": 17
    },
    {
      "adult": false,
      "gender": 2,
      "id": 2246,
      "known_for_department": "Acting",
      "name": "Earl Cameron",
      "original_name": "Earl Cameron",
      "popularity": 0.6034,
      "profile_path": "/y7ZZ7dfUozDzIMjMkmw6BD7lkSJ.jpg",
      "cast_id": 97,
      "character": "Elderly Bald Man",
      "credit_id": "57d48b59c3a3685568007cd7",
      "order": 18
    },
    {
      "adult": false,
      "gender": 2,
      "id": 1677267,
      "known_for_department": "Acting",
      "name": "Ryan Hayward",
      "original_name": "Ryan Hayward",
      "popularity": 0.4477,
      "profile_path": "/b3zGgBljHB7MuXwDRAUJr4HRBzl.jpg",
      "cast_id": 98,
      "character": "Lawyer",
      "credit_id": "57d48b6dc3a3680ccd001433",
      "order": 19
    },
    {
      "adult": false,
      "gender": 1,
      "id": 1334309,
      "known_for_department": "Acting",
      "name": "Miranda Nolan",
      "original_name": "Miranda Nolan",
      "popularity": 0.8923,
      "profile_path": "/xzQJpQicKgeFtCqZ1xwr0Rhdf5t.jpg",
      "cast_id": 99,
      "character": "Flight Attendant",
      "credit_id": "57d48b84925141382f0012af",
      "order": 20
    },
    {
      "adult": false,
      "gender": 2,
      "id": 535,
      "known_for_department": "Acting",
      "name": "Russ Fega",
      "original_name": "Russ Fega",
      "popularity": 0.7297,
      "profile_path": "/d0W7kq97Ul8Iz5LZIVNDKxSly8M.jpg",
      "cast_id": 100,
      "character": "Cab Driver",
      "credit_id": "57d53da09251415c1e000263",
      "order": 21
    },
    {
      "adult": false,
      "gender": 2,
      "id": 72864,
      "known_for_department": "Acting",
      "name": "Tim Kelleher",
      "original_name": "Tim Kelleher",
      "popularity": 1.2855,
      "profile_path": "/8W3KgoIPUMNjqb3CxC9B8QjBsjM.jpg",
      "cast_id": 101,
      "character": "Thin Man",
      "credit_id": "57d53db4c3a368556800ce41",
      "order": 22
    },
    {
      "adult": false,
      "gender": 1,
      "id": 1677498,
      "known_for_department": "Acting",
      "name": "Coralie Dedykere",
      "original_name": "Coralie Dedykere",
      "popularity": 0.2874,
      "profile_path": "/2UgRqOOdn1wFEZWbnS7JY83bJnh.jpg",
      "cast_id": 102,
      "character": "Bridge Sub Con",
      "credit_id": "57d53e46c3a36812b2000308",
      "order": 23
    },
    {
      "adult": false,
      "gender": 1,
      "id": 13695,
      "known_for_department": "Acting",
      "name": "Silvie Laguna",
      "original_name": "Silvie Laguna",
      "popularity": 0.729,
      "profile_path": "/qDRqkAVWYhUN6P3flH5VuKKVcM8.jpg",
      "cast_id": 103,
      "character": "Bridge Sub Con",
      "credit_id": "57d53ee6c3a3686e3c000cd9",
      "order": 24
    },
    {
      "adult": false,
      "gender": 2,
      "id": 133257,
      "known_for_department": "Acting",
      "name": "Virgile Bramly",
      "original_name": "Virgile Bramly",
      "popularity": 0.6267,
      "profile_path": "/1bbSzSPfT61YV2SI7cgTkbVPMeK.jpg",
      "cast_id": 104,
      "character": "Bridge Sub Con",
      "credit_id": "57d53efcc3a36813230002f5",
      "order": 25
    },
    {
      "adult": false,
      "gender": 2,
      "id": 1677507,
      "known_for_department": "Acting",
      "name": "Nicolas Clerc",
      "original_name": "Nicolas Clerc",
      "popularity": 0.1857,
      "profile_path": null,
      "cast_id": 105,
      "character": "Bridge Sub Con",
      "credit_id": "57d53fde9251415c1e000324",
      "order": 26
    },
    {
      "adult": false,
      "gender": 2,
      "id": 1536351,
      "known_for_department": "Acting",
      "name": "Jean-Michel Dagory",
      "original_name": "Jean-Michel Dagory",
      "popularity": 0.2555,
      "profile_path": null,
      "cast_id": 106,
      "character": "Bridge Sub Con",
      "credit_id": "57d5405f9251415bb300037f",
      "order": 27
    },
    {
      "adult": false,
      "gender": 2,
      "id": 203087,
      "known_for_department": "Acting",
      "name": "Marc Raducci",
      "original_name": "Marc Raducci",
      "popularity": 0.318,
      "profile_path": "/twPlvPjynzWLnDgczD8tOAHdF6C.jpg",
      "cast_id": 107,
      "character": "Lobby Sub Con",
      "credit_id": "57d540c7c3a36813230003bc",
      "order": 28
    },
    {
      "adult": false,
      "gender": 0,
      "id": 2157567,
      "known_for_department": "Acting",
      "name": "Tai-Li Lee",
      "original_name": "Tai-Li Lee",
      "popularity": 0.1637,
      "profile_path": "/lS8ksFaUsdTdbjTzLgHN5N4zeCl.jpg",
      "cast_id": 117,
      "character": "Tadashi",
      "credit_id": "5bcdbc1a0e0a260151022053",
      "order": 29
    },
    {
      "adult": false,
      "gender": 2,
      "id": 2157568,
      "known_for_department": "Acting",
      "name": "Magnus Nolan",
      "original_name": "Magnus Nolan",
      "popularity": 1.2208,
      "profile_path": null,
      "cast_id": 118,
      "character": "James (20 months)",
      "credit_id": "5bcdbc29c3a368286302325d",
      "order": 30
    },
    {
      "adult": false,
      "gender": 0,
      "id": 2157569,
      "known_for_department": "Acting",
      "name": "Helena Cullinan",
      "original_name": "Helena Cullinan",
      "popularity": 0.3994,
      "profile_path": null,
      "cast_id": 119,
      "character": "Penrose Sub Con",
      "credit_id": "5bcdbc36925141613801df6b",
      "order": 31
    },
    {
      "adult": false,
      "gender": 2,
      "id": 1470134,
      "known_for_department": "Acting",
      "name": "Mark Fleischmann",
      "original_name": "Mark Fleischmann",
      "popularity": 0.6371,
      "profile_path": "/4Xki6fvgwjRXVmV9pEinAhqK6XJ.jpg",
      "cast_id": 120,
      "character": "Penrose Sub Con",
      "credit_id": "5bcdbc610e0a26015f0220a3",
      "order": 32
    },
    {
      "adult": false,
      "gender": 0,
      "id": 2157570,
      "known_for_department": "Acting",
      "name": "Shelley Lang",
      "original_name": "Shelley Lang",
      "popularity": 0.1239,
      "profile_path": null,
      "cast_id": 121,
      "character": "Penrose Sub Con",
      "credit_id": "5bcdbc690e0a26016e0219d7",
      "order": 33
    },
    {
      "adult": false,
      "gender": 2,
      "id": 2157571,
      "known_for_department": "Acting",
      "name": "Adam Cole",
      "original_name": "Adam Cole",
      "popularity": 0.2151,
      "profile_path": "/6stnyhAOiA0JuOJ1tTVQKnVvVWj.jpg",
      "cast_id": 122,
      "character": "Bar Sub Con",
      "credit_id": "5bcdbcb2c3a3682870023a6a",
      "order": 34
    },
    {
      "adult": false,
      "gender": 2,
      "id": 1460686,
      "known_for_department": "Acting",
      "name": "Jack Murray",
      "original_name": "Jack Murray",
      "popularity": 0.6539,
      "profile_path": "/kwSd0y9yBTLlHfvmDf5SKh6SX1k.jpg",
      "cast_id": 123,
      "character": "Bar Sub Con",
      "credit_id": "5bcdbcc6c3a368286a024f6a",
      "order": 35
    },
    {
      "adult": false,
      "gender": 0,
      "id": 1742659,
      "known_for_department": "Acting",
      "name": "Kraig Thornber",
      "original_name": "Kraig Thornber",
      "popularity": 0.2521,
      "profile_path": null,
      "cast_id": 124,
      "character": "Bar Sub Con",
      "credit_id": "5bcdbcd1925141613e01de41",
      "order": 36
    },
    {
      "adult": false,
      "gender": 0,
      "id": 2157572,
      "known_for_department": "Acting",
      "name": "Angela Nathenson",
      "original_name": "Angela Nathenson",
      "popularity": 0.06,
      "profile_path": null,
      "cast_id": 125,
      "character": "Bar Sub Con",
      "credit_id": "5bcdbcda925141612d020ddc",
      "order": 37
    },
    {
      "adult": false,
      "gender": 1,
      "id": 61642,
      "known_for_department": "Acting",
      "name": "Natasha Beaumont",
      "original_name": "Natasha Beaumont",
      "popularity": 0.512,
      "profile_path": "/svKLagcLLHidlpGpjEnSaYOZxeP.jpg",
      "cast_id": 126,
      "character": "Bar Sub Con",
      "credit_id": "5bcdbce3c3a3682863023393",
      "order": 38
    },
    {
      "adult": false,
      "gender": 2,
      "id": 155308,
      "known_for_department": "Acting",
      "name": "Carl Gilliard",
      "original_name": "Carl Gilliard",
      "popularity": 0.6362,
      "profile_path": null,
      "cast_id": 127,
      "character": "Lobby Sub Con",
      "credit_id": "5bcdbcecc3a368286d02475e",
      "order": 39
    },
    {
      "adult": false,
      "gender": 1,
      "id": 2157573,
      "known_for_department": "Acting",
      "name": "Jill Maddrell",
      "original_name": "Jill Maddrell",
      "popularity": 0.1802,
      "profile_path": "/wIab80Zd2v740NjGWxaph9tNflO.jpg",
      "cast_id": 128,
      "character": "Lobby Sub Con",
      "credit_id": "5bcdbcf5925141613401f960",
      "order": 40
    },
    {
      "adult": false,
      "gender": 1,
      "id": 565500,
      "known_for_department": "Acting",
      "name": "Alex Lombard",
      "original_name": "Alex Lombard",
      "popularity": 0.3641,
      "profile_path": "/7rRd2byURAqE2QObL3wJyHYQbpL.jpg",
      "cast_id": 129,
      "character": "Lobby Sub Con",
      "credit_id": "5bcdbd26c3a368286a025014",
      "order": 41
    },
    {
      "adult": false,
      "gender": 1,
      "id": 98811,
      "known_for_department": "Acting",
      "name": "Nicole Pulliam",
      "original_name": "Nicole Pulliam",
      "popularity": 0.6652,
      "profile_path": "/XcJAw0P7bPE9ET52P4fZ2hdokk.jpg",
      "cast_id": 130,
      "character": "Lobby Sub Con",
      "credit_id": "5bcdbd2f925141612a01f459",
      "order": 42
    },
    {
      "adult": false,
      "gender": 2,
      "id": 1168075,
      "known_for_department": "Acting",
      "name": "Peter Basham",
      "original_name": "Peter Basham",
      "popularity": 0.7086,
      "profile_path": "/4AtYLZu7jX5ROgB9rCzYhicbLqk.jpg",
      "cast_id": 131,
      "character": "Fischer's Jet Captain",
      "credit_id": "5bcdbd38925141612d020fa2",
      "order": 43
    },
    {
      "adult": false,
      "gender": 2,
      "id": 33241,
      "known_for_department": "Acting",
      "name": "Michael Gaston",
      "original_name": "Michael Gaston",
      "popularity": 3.145,
      "profile_path": "/lXhqiW4J1n9bnbfwz0Kdf2sjGLU.jpg",
      "cast_id": 132,
      "character": "Immigration Officer",
      "credit_id": "5bcdbd41c3a3682873021710",
      "order": 44
    },
    {
      "adult": false,
      "gender": 2,
      "id": 208492,
      "known_for_department": "Acting",
      "name": "Felix Scott",
      "original_name": "Felix Scott",
      "popularity": 0.5265,
      "profile_path": "/sRlcbtzrmVMEVdJAH6xocbYdfhr.jpg",
      "cast_id": 133,
      "character": "Businessman",
      "credit_id": "5bcdbd4a925141612601fbd1",
      "order": 45
    },
    {
      "adult": false,
      "gender": 2,
      "id": 17291,
      "known_for_department": "Acting",
      "name": "Andrew Pleavin",
      "original_name": "Andrew Pleavin",
      "popularity": 0.909,
      "profile_path": "/hp20HveWeBveVYtE87DPwmXEpD2.jpg",
      "cast_id": 134,
      "character": "Businessman",
      "credit_id": "5bcdbd57925141613b01ee04",
      "order": 46
    },
    {
      "adult": false,
      "gender": 0,
      "id": 2011839,
      "known_for_department": "Acting",
      "name": "Lisa Reynolds",
      "original_name": "Lisa Reynolds",
      "popularity": 0.2012,
      "profile_path": "/kBFTzvYveef33Ci4PlKuDe7wGuD.jpg",
      "cast_id": 135,
      "character": "Private Nurse",
      "credit_id": "5bcdbd6c0e0a26016b022cba",
      "order": 47
    },
    {
      "adult": false,
      "gender": 0,
      "id": 2157574,
      "known_for_department": "Acting",
      "name": "Jason Tendell",
      "original_name": "Jason Tendell",
      "popularity": 0.1398,
      "profile_path": null,
      "cast_id": 136,
      "character": "Fischer's Driver",
      "credit_id": "5bcdbd770e0a260162022691",
      "order": 48
    },
    {
      "adult": false,
      "gender": 2,
      "id": 2157575,
      "known_for_department": "Acting",
      "name": "Jack Gilroy",
      "original_name": "Jack Gilroy",
      "popularity": 0.2229,
      "profile_path": null,
      "cast_id": 137,
      "character": "Old Cobb",
      "credit_id": "5bcdbd84925141612d020ffc",
      "order": 49
    },
    {
      "adult": false,
      "gender": 1,
      "id": 1217812,
      "known_for_department": "Acting",
      "name": "Shannon Welles",
      "original_name": "Shannon Welles",
      "popularity": 0.6661,
      "profile_path": null,
      "cast_id": 138,
      "character": "Old Mal",
      "credit_id": "5bcdbd93c3a368286302346f",
      "order": 50
    },
    {
      "adult": false,
      "gender": 2,
      "id": 3443663,
      "known_for_department": "Acting",
      "name": "Daniel Girondeaud",
      "original_name": "Daniel Girondeaud",
      "popularity": 0.1828,
      "profile_path": "/oTLqQ4Cj5LhAbopXAq71hodKSdB.jpg",
      "cast_id": 804,
      "character": "Bridge Sub Con",
      "credit_id": "621943570e597b00412a9812",
      "order": 51
    },
    {
      "adult": false,
      "gender": 1,
      "id": 1269147,
      "known_for_department": "Acting",
      "name": "Flower Meg",
      "original_name": "フラワー・メグ",
      "popularity": 0.5791,
      "profile_path": "/32MYuH0EY0d6D0I8Bqe2RpjVITc.jpg",
      "cast_id": 883,
      "character": "Asian woman",
      "credit_id": "6a5a617b73b4ac4a2c70815c",
      "order": 52
    },
    {
      "adult": false,
      "gender": 0,
      "id": 1080198,
      "known_for_department": "Acting",
      "name": "Sari Akasaka",
      "original_name": "Sari Akasaka",
      "popularity": 0.2688,
      "profile_path": "/rZDnbRBjdUQkM6MBjxIWUa77eto.jpg",
      "cast_id": 884,
      "character": "Florist",
      "credit_id": "6a5a62c683bc45f37858eedd",
      "order": 53
    },
    {
      "adult": false,
      "gender": 0,
      "id": 1885268,
      "known_for_department": "Acting",
      "name": "Emi Tabata",
      "original_name": "Emi Tabata",
      "popularity": 0.1557,
      "profile_path": "/1O1W9FNmKZVHNQr8GhjEVHUTgdC.jpg",
      "cast_id": 885,
      "character": "Scientist (uncredited)",
      "credit_id": "6a5a62dc0218dc97731f33a4",
      "order": 54
    },
    {
      "adult": false,
      "gender": 1,
      "id": 5937,
      "known_for_department": "Acting",
      "name": "Kari Matchett",
      "original_name": "Kari Matchett",
      "popularity": 2.509,
      "profile_path": "/zafZ5iFwDDmuJpROAgtF8psx3BU.jpg",
      "cast_id": 886,
      "character": "Jenny",
      "credit_id": "6a5a62fd0abd3cf852feb643",
      "order": 55
    }
  ],
  "creators": [
    "Christopher Nolan"
  ],
  "videos": [
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "The Dream Sequence",
      "key": "mpj9dL7swwk",
      "site": "YouTube",
      "size": 720,
      "type": "Clip",
      "official": true,
      "id": "622d5cc322931a00454e588c",
      "published_at": "2022-03-09T01:00:20.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "35mm Theatrical Trailer #3 [5.1] [4K] [FTD-0706]",
      "key": "cdx31ak4KbQ",
      "site": "YouTube",
      "size": 2160,
      "type": "Trailer",
      "official": false,
      "id": "653c6111c8a5ac00e3a09f82",
      "published_at": "2022-03-07T06:00:19.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "The Final Scene",
      "key": "k5DTbekB86s",
      "site": "YouTube",
      "size": 720,
      "type": "Clip",
      "official": true,
      "id": "622c37f7a579f90046e2824e",
      "published_at": "2022-03-06T16:00:31.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "Christopher Nolan & Leonardo DiCaprio on Inception | Film4 Interview Special Archives",
      "key": "SBmxYERafeU",
      "site": "YouTube",
      "size": 1080,
      "type": "Featurette",
      "official": true,
      "id": "623305b4109cd0001bc00bf7",
      "published_at": "2020-02-07T10:45:20.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "Michael Caine explains the ending of Inception at Film4 Summer Screen",
      "key": "Ms56yWZak9w",
      "site": "YouTube",
      "size": 1080,
      "type": "Featurette",
      "official": true,
      "id": "62331e4e53866e00485113e3",
      "published_at": "2018-08-17T11:43:52.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "\"Inception\" winning the Oscar® for Sound Editing",
      "key": "54Od-ZJHox0",
      "site": "YouTube",
      "size": 720,
      "type": "Featurette",
      "official": true,
      "id": "6a6112a74af7b7059d2023ed",
      "published_at": "2016-02-04T20:44:39.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "\"Inception\" winning the Oscar® for Sound Mixing",
      "key": "if_IcKvxBDA",
      "site": "YouTube",
      "size": 720,
      "type": "Featurette",
      "official": true,
      "id": "6a6112be382baba907907851",
      "published_at": "2016-02-04T20:44:39.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "\"Inception\" winning Best Cinematography",
      "key": "aRDEd1BAdc8",
      "site": "YouTube",
      "size": 720,
      "type": "Featurette",
      "official": true,
      "id": "6a611251cdf0b6aab7a4f279",
      "published_at": "2011-03-05T00:21:52.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "\"Inception\" winning the Oscar® for Visual Effects",
      "key": "rTWI33cOMF0",
      "site": "YouTube",
      "size": 720,
      "type": "Featurette",
      "official": true,
      "id": "6a611236c32ae154e68b133e",
      "published_at": "2011-03-04T23:54:34.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "An Extended Special Look",
      "key": "Fl7KyyKqqhE",
      "site": "YouTube",
      "size": 1080,
      "type": "Behind the Scenes",
      "official": true,
      "id": "622c387fd363e50070d0d2c7",
      "published_at": "2011-02-08T17:47:26.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "8 Academy Award® Nominations",
      "key": "Cc8p-dqF1LU",
      "site": "YouTube",
      "size": 720,
      "type": "Behind the Scenes",
      "official": true,
      "id": "622c39c70cb3350070a18891",
      "published_at": "2011-01-28T02:06:19.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "IMAX® Presents: Inception's Christopher Nolan",
      "key": "fn6vJ8WPpvw",
      "site": "YouTube",
      "size": 1080,
      "type": "Featurette",
      "official": true,
      "id": "6a61133d4e33c856fc202429",
      "published_at": "2010-07-12T23:06:25.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "TV Spot #9",
      "key": "HO5v3RhO8ek",
      "site": "YouTube",
      "size": 720,
      "type": "Teaser",
      "official": true,
      "id": "622c3a1d069f0e00463cde5d",
      "published_at": "2010-06-29T23:22:58.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "TV Spot #8",
      "key": "CJXn7hNtblE",
      "site": "YouTube",
      "size": 720,
      "type": "Teaser",
      "official": true,
      "id": "622c3a4d9a3c49001d1aa427",
      "published_at": "2010-06-29T23:20:19.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "TV Spot #7",
      "key": "niw40pVKctc",
      "site": "YouTube",
      "size": 720,
      "type": "Teaser",
      "official": true,
      "id": "622c3a41532acb001b36d16f",
      "published_at": "2010-06-29T23:17:14.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "TV Spot #6",
      "key": "8XjKtoTFuLo",
      "site": "YouTube",
      "size": 720,
      "type": "Teaser",
      "official": true,
      "id": "622c39ff63aad2004596595f",
      "published_at": "2010-06-25T23:40:40.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "TV Spot #5",
      "key": "8jRd8qRcaLI",
      "site": "YouTube",
      "size": 720,
      "type": "Teaser",
      "official": true,
      "id": "622c3a3484591c006e7e8a89",
      "published_at": "2010-06-25T23:07:11.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "Characters",
      "key": "hW0M4xXxqpw",
      "site": "YouTube",
      "size": 1080,
      "type": "Featurette",
      "official": true,
      "id": "622c398fa579f90046e285b3",
      "published_at": "2010-06-25T22:10:29.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "TV Spot #4",
      "key": "sn8JQgjSr7k",
      "site": "YouTube",
      "size": 720,
      "type": "Teaser",
      "official": true,
      "id": "622c3a0ea579f90046e286a0",
      "published_at": "2010-06-25T01:41:42.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "IMAX® TV Spot",
      "key": "uwyJfuM-ViA",
      "site": "YouTube",
      "size": 1080,
      "type": "Teaser",
      "official": true,
      "id": "6a6113c3736a8623d4a4f2b8",
      "published_at": "2010-06-24T22:24:09.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "TV Spot #3",
      "key": "RDgRNxSm53o",
      "site": "YouTube",
      "size": 720,
      "type": "Teaser",
      "official": true,
      "id": "622c3a77069f0e001daa8899",
      "published_at": "2010-06-09T00:09:34.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "TV Spot #2",
      "key": "J4BnDN7A-pk",
      "site": "YouTube",
      "size": 720,
      "type": "Teaser",
      "official": true,
      "id": "622c39e1d363e50047399fd8",
      "published_at": "2010-06-09T00:07:58.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "TV Spot #1",
      "key": "7aED7XBmbyQ",
      "site": "YouTube",
      "size": 720,
      "type": "Teaser",
      "official": true,
      "id": "622c39f3025764001b3bdb94",
      "published_at": "2010-06-09T00:04:02.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "TV Spot",
      "key": "cG_i7xnkMu8",
      "site": "YouTube",
      "size": 720,
      "type": "Teaser",
      "official": true,
      "id": "622c3c210cb33500485638a1",
      "published_at": "2010-06-04T01:11:35.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "Official New UK Trailer",
      "key": "JE9z-gy4De4",
      "site": "YouTube",
      "size": 1080,
      "type": "Trailer",
      "official": true,
      "id": "638cadf5c3aa3f0084cd2074",
      "published_at": "2010-05-11T15:00:54.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "Official UK Teaser Trailer",
      "key": "hstBN0Qkqhc",
      "site": "YouTube",
      "size": 1080,
      "type": "Teaser",
      "official": true,
      "id": "638cae37ab5e3400cf5fe5d4",
      "published_at": "2010-05-11T11:29:13.000Z"
    },
    {
      "iso_639_1": "en",
      "iso_3166_1": "US",
      "name": "Official Trailer",
      "key": "Jvurpf91omw",
      "site": "YouTube",
      "size": 1080,
      "type": "Trailer",
      "official": true,
      "id": "574bc2099251417fc0000c4d",
      "published_at": "2010-01-09T00:34:42.000Z"
    }
  ],
  "similar": [
    {
      "adult": false,
      "backdrop_path": "/pVVobDO8cezhVPvwD6EBUN0g3mt.jpg",
      "id": 353491,
      "title": "The Dark Tower",
      "original_title": "The Dark Tower",
      "overview": "A boy haunted by visions of a parallel world aids its disillusioned guardian in preventing the destruction of the nexus of universes known as the Dark Tower.",
      "poster_path": "/i9GUSgddIqrroubiLsvvMRYyRy0.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        14,
        28,
        878
      ],
      "popularity": 9.2444,
      "release_date": "2017-08-03",
      "softcore": false,
      "video": false,
      "vote_average": 5.801,
      "vote_count": 5590
    },
    {
      "adult": false,
      "backdrop_path": "/7LZ0K4FsALrt7OeNIGOVLNuKQRU.jpg",
      "id": 348350,
      "title": "Solo: A Star Wars Story",
      "original_title": "Solo: A Star Wars Story",
      "overview": "Through a series of daring escapades deep within a dark and dangerous criminal underworld, Han Solo meets his mighty future copilot Chewbacca and encounters the notorious gambler Lando Calrissian.",
      "poster_path": "/4oD6VEccFkorEBTEDXtpLAaz0Rl.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        878,
        12,
        28
      ],
      "popularity": 11.1777,
      "release_date": "2018-05-15",
      "softcore": false,
      "video": false,
      "vote_average": 6.557,
      "vote_count": 9375
    },
    {
      "adult": false,
      "backdrop_path": "/uQ5xARQz6BiKlppKCBnKmkfW76m.jpg",
      "id": 13455,
      "title": "Push",
      "original_title": "Push",
      "overview": "After his father, an assassin, is brutally murdered, Nick Gant vows revenge on Division, the covert government agency that dabbles in psychic warfare and experimental drugs. Hiding in Hong Kong's underworld, Nick assembles a band of rogue psychics dedicated to destroying Division. Together with Cassie, a teenage clairvoyant, Nick goes in search of a missing girl and a stolen suitcase that could be the key to accomplishing their mutual goal.",
      "poster_path": "/fHStfRjQGstuqtUz4Q22lbFU58M.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        878,
        28,
        12,
        53
      ],
      "popularity": 6.433,
      "release_date": "2009-02-04",
      "softcore": false,
      "video": false,
      "vote_average": 6.1,
      "vote_count": 2473
    },
    {
      "adult": false,
      "backdrop_path": "/rdlXnumaarKFHQ4rB8YBWINEeuE.jpg",
      "id": 9620,
      "title": "Paycheck",
      "original_title": "Paycheck",
      "overview": "Michael Jennings is a genius who's hired – and paid handsomely – by high-tech firms to work on highly sensitive projects, after which his short-term memory is erased so he's incapable of breaching security. But at the end of a three-year job, he's told he isn't getting a paycheck and instead receives a mysterious envelope. In it are clues he must piece together to find out why he wasn't paid – and why he's now in hot water.",
      "poster_path": "/h0BWaPnWYXwbCXF69DxS0YWcVy2.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        28,
        12,
        9648,
        878,
        53
      ],
      "popularity": 5.0648,
      "release_date": "2003-12-25",
      "softcore": false,
      "video": false,
      "vote_average": 6.223,
      "vote_count": 2067
    },
    {
      "adult": false,
      "backdrop_path": "/dDVqfmCzSy3TKSmiS2pJ9QB5E3P.jpg",
      "id": 315837,
      "title": "Ghost in the Shell",
      "original_title": "Ghost in the Shell",
      "overview": "In the near future, Major is the first of her kind: a human saved from a terrible crash, then cyber-enhanced to be a perfect soldier devoted to stopping the world's most dangerous criminals.",
      "poster_path": "/zCtL3UBgCoZzd7XTVGhvl6XY75E.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        878,
        18,
        28
      ],
      "popularity": 10.0849,
      "release_date": "2017-03-29",
      "softcore": false,
      "video": false,
      "vote_average": 6.11,
      "vote_count": 8648
    },
    {
      "adult": false,
      "backdrop_path": "/dv4tLF2gISz3w1e9YK3rK1jxpLj.jpg",
      "id": 4965,
      "title": "Impostor",
      "original_title": "Impostor",
      "overview": "A top-secret government weapons designer is arrested by a clandestine government organization on suspicion of being a clone created by the hostile alien race wanting to take over Earth.",
      "poster_path": "/7Uy4JbalP0mEyKnFW2IorQDmbBa.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        28,
        878,
        53
      ],
      "popularity": 2.3687,
      "release_date": "2001-12-03",
      "softcore": false,
      "video": false,
      "vote_average": 6.13,
      "vote_count": 485
    },
    {
      "adult": false,
      "backdrop_path": "/hmv300bqfZmxvdXCtCsruDH0ycT.jpg",
      "id": 453405,
      "title": "Gemini Man",
      "original_title": "Gemini Man",
      "overview": "Henry Brogan is an elite 51-year-old assassin who's ready to call it quits after completing his 72nd job. His plans get turned upside down when he becomes the target of a mysterious operative who can seemingly predict his every move. To his horror, Brogan soon learns that the man who's trying to kill him is a younger, faster, cloned version of himself.",
      "poster_path": "/uTALxjQU8e1lhmNjP9nnJ3t2pRU.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        878,
        28,
        12,
        53,
        18
      ],
      "popularity": 8.7793,
      "release_date": "2019-10-02",
      "softcore": false,
      "video": false,
      "vote_average": 6.261,
      "vote_count": 5511
    },
    {
      "adult": false,
      "backdrop_path": "/kjQBrc00fB2RjHZB3PGR4w9ibpz.jpg",
      "id": 670292,
      "title": "The Creator",
      "original_title": "The Creator",
      "overview": "Amid a future war between the human race and the forces of artificial intelligence, a hardened ex-special forces agent grieving the disappearance of his wife, is recruited to hunt down and kill the Creator, the elusive architect of advanced AI who has developed a mysterious weapon with the power to end the war—and mankind itself.",
      "poster_path": "/3dSivDtOuyxLDxPH4v2tcNG1fP7.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        878,
        28,
        12
      ],
      "popularity": 13.9752,
      "release_date": "2023-09-27",
      "softcore": false,
      "video": false,
      "vote_average": 7.029,
      "vote_count": 4050
    },
    {
      "adult": false,
      "backdrop_path": "/2n7lYEeIbucsEQCswRcVB6ZYmMP.jpg",
      "id": 777443,
      "title": "The Electric State",
      "original_title": "The Electric State",
      "overview": "An orphaned teen hits the road with a mysterious robot to find her long-lost brother, teaming up with a smuggler and his wisecracking sidekick.",
      "poster_path": "/sI2NiMU8o65hmIMY0JI9CjJ0p7f.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        28,
        12,
        878
      ],
      "popularity": 13.2848,
      "release_date": "2025-02-24",
      "softcore": false,
      "video": false,
      "vote_average": 6.48,
      "vote_count": 1730
    },
    {
      "adult": false,
      "backdrop_path": "/bUBhTRcofZTU8UBrI2Sl2p5Qdd8.jpg",
      "id": 10003,
      "title": "The Saint",
      "original_title": "The Saint",
      "overview": "Simon Templar (The Saint), is a thief for hire, whose latest job to steal the secret process for cold fusion puts him at odds with a traitor bent on toppling the Russian government, as well as the woman who holds its secret.",
      "poster_path": "/k43wPAVeepqzGwP52dKcknQjquj.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        53,
        28,
        10749,
        878,
        12
      ],
      "popularity": 5.9794,
      "release_date": "1997-04-03",
      "softcore": false,
      "video": false,
      "vote_average": 6.117,
      "vote_count": 1271
    },
    {
      "adult": false,
      "backdrop_path": "/bu0LiPEWKHWViRoaFwlTAzZ8wyS.jpg",
      "id": 203801,
      "title": "The Man from U.N.C.L.E.",
      "original_title": "The Man from U.N.C.L.E.",
      "overview": "At the height of the Cold War, a mysterious criminal organization plans to use nuclear weapons and technology to upset the fragile balance of power between the United States and Soviet Union. CIA agent Napoleon Solo and KGB agent Illya Kuryakin are forced to put aside their hostilities and work together to stop the evildoers in their tracks. The duo's only lead is the daughter of a missing German scientist, whom they must find soon to prevent a global catastrophe.",
      "poster_path": "/y5yZaForGSJbPD66Cvq9AT5WMAD.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        35,
        28,
        12
      ],
      "popularity": 9.8838,
      "release_date": "2015-08-13",
      "softcore": false,
      "video": false,
      "vote_average": 7.079,
      "vote_count": 6941
    },
    {
      "adult": false,
      "backdrop_path": "/qSP072apfe2EEcd5Qg9vGYy2OLw.jpg",
      "id": 262504,
      "title": "Allegiant",
      "original_title": "Allegiant",
      "overview": "Beatrice Prior and Tobias Eaton venture into the world outside of the fence and are taken into protective custody by a mysterious agency known as the Bureau of Genetic Welfare.",
      "poster_path": "/faq9JlF8znUGQ5p3En1W61Fi5p0.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        12,
        878,
        28,
        9648
      ],
      "popularity": 7.9598,
      "release_date": "2016-03-09",
      "softcore": false,
      "video": false,
      "vote_average": 6.1,
      "vote_count": 7043
    },
    {
      "adult": false,
      "backdrop_path": "/ibJEhfV4CudcL3iaUgvhkBrfMCO.jpg",
      "id": 36669,
      "title": "Die Another Day",
      "original_title": "Die Another Day",
      "overview": "James Bond is sent to investigate the connection between a North Korean terrorist and a diamond mogul, who is funding the development of an international space weapon.",
      "poster_path": "/bZmGqOhMhaLn8AoFMvFDct4tbrL.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        12,
        28,
        53
      ],
      "popularity": 8.0045,
      "release_date": "2002-11-17",
      "softcore": false,
      "video": false,
      "vote_average": 5.999,
      "vote_count": 3937
    },
    {
      "adult": false,
      "backdrop_path": "/qCPLtXrTB10UsgAFxsWOB44gDPu.jpg",
      "id": 412656,
      "title": "Chaos Walking",
      "original_title": "Chaos Walking",
      "overview": "Two unlikely companions embark on a perilous adventure through the badlands of an unexplored planet as they try to escape a dangerous and disorienting reality, where all inner thoughts are seen and heard by everyone.",
      "poster_path": "/xAYGdGBGptNkisXRpmhZSry6SPF.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        14,
        878,
        12
      ],
      "popularity": 6.8704,
      "release_date": "2021-02-24",
      "softcore": false,
      "video": false,
      "vote_average": 6.545,
      "vote_count": 2639
    },
    {
      "adult": false,
      "backdrop_path": "/2kVt8oj1cSz4GAP0Hi8SESOiH0T.jpg",
      "id": 75612,
      "title": "Oblivion",
      "original_title": "Oblivion",
      "overview": "Jack Harper is one of the last few drone repairmen stationed on Earth. Part of a massive operation to extract vital resources after decades of war with a terrifying threat known as the Scavs, Jack’s mission is nearly complete. His existence is brought crashing down when he rescues a beautiful  stranger from a downed spacecraft. Her arrival triggers a chain of events that  forces him to question everything he knows and puts the fate of humanity in his hands.",
      "poster_path": "/bYLM3GpNUZnoFElPXp1zlhDPdtv.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        28,
        878,
        12,
        9648
      ],
      "popularity": 11.0435,
      "release_date": "2013-04-10",
      "softcore": false,
      "video": false,
      "vote_average": 6.687,
      "vote_count": 11653
    },
    {
      "adult": false,
      "backdrop_path": "/tlm8UkiQsitc8rSuIAscQDCnP8d.jpg",
      "id": 603,
      "title": "The Matrix",
      "original_title": "The Matrix",
      "overview": "Set in the 22nd century, The Matrix tells the story of a computer hacker who joins a group of underground insurgents fighting the vast and powerful computers who now rule the earth.",
      "poster_path": "/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        28,
        878
      ],
      "popularity": 48.6813,
      "release_date": "1999-03-31",
      "softcore": false,
      "video": false,
      "vote_average": 8.253,
      "vote_count": 28308
    },
    {
      "adult": false,
      "backdrop_path": "/5XNQBqnBwPA9yT0jZ0p3s8bbLh0.jpg",
      "id": 157336,
      "title": "Interstellar",
      "original_title": "Interstellar",
      "overview": "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.",
      "poster_path": "/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        12,
        18,
        878
      ],
      "popularity": 76.1696,
      "release_date": "2014-11-05",
      "softcore": false,
      "video": false,
      "vote_average": 8.483,
      "vote_count": 40547
    },
    {
      "adult": false,
      "backdrop_path": "/uUa6jgSr5BQpcBhhaz1PV1JhSa4.jpg",
      "id": 20526,
      "title": "TRON: Legacy",
      "original_title": "TRON: Legacy",
      "overview": "Sam Flynn, the tech-savvy and daring son of Kevin Flynn, investigates his father's disappearance and is pulled into The Grid. With the help of a mysterious program named Quorra, Sam quests to stop evil dictator Clu from crossing into the real world.",
      "poster_path": "/8Nc6R8k7bG8frSiDJo0oLucF7dN.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        12,
        28,
        878
      ],
      "popularity": 17.8774,
      "release_date": "2010-12-14",
      "softcore": false,
      "video": false,
      "vote_average": 6.545,
      "vote_count": 8034
    },
    {
      "adult": false,
      "backdrop_path": "/7mHeyU0a538bgguOeF57I8ZroSk.jpg",
      "id": 324668,
      "title": "Jason Bourne",
      "original_title": "Jason Bourne",
      "overview": "The most dangerous former operative of the CIA is drawn out of hiding to uncover hidden truths about his past.",
      "poster_path": "/xA7N41glw17MBQtcWSm2eBlBRuG.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        28,
        12,
        53
      ],
      "popularity": 10.1388,
      "release_date": "2016-07-27",
      "softcore": false,
      "video": false,
      "vote_average": 6.382,
      "vote_count": 6281
    },
    {
      "adult": false,
      "backdrop_path": "/rPaOAtK6OpnHQ9r61WPM4WWNxaH.jpg",
      "id": 152,
      "title": "Star Trek: The Motion Picture",
      "original_title": "Star Trek: The Motion Picture",
      "overview": "When an unidentified alien destroys three powerful Klingon cruisers, Captain James T. Kirk returns to the newly transformed U.S.S. Enterprise to take command.",
      "poster_path": "/wfiAfNwH6CMKxz4vRaW8CPTabtk.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        878,
        12,
        9648
      ],
      "popularity": 8.5824,
      "release_date": "1979-12-07",
      "softcore": false,
      "video": false,
      "vote_average": 6.479,
      "vote_count": 1962
    },
    {
      "adult": false,
      "backdrop_path": "/tKZMG0k7lr9UUCLbI5EEnzMf8Dy.jpg",
      "genre_ids": [
        28,
        35
      ],
      "id": 21449,
      "title": "What's Up, Tiger Lily?",
      "original_language": "en",
      "original_title": "What's Up, Tiger Lily?",
      "overview": "In comic Woody Allen's film debut, he took the Japanese action film \"International Secret Police: Key of Keys\" and re-dubbed it, changing the plot to make it revolve around a secret egg salad recipe.",
      "popularity": 1.1086,
      "poster_path": "/z3ABDEfhLqX09nXgp6ilKW44jAB.jpg",
      "release_date": "1966-11-02",
      "softcore": false,
      "video": false,
      "vote_average": 5.354,
      "vote_count": 213
    },
    {
      "adult": false,
      "backdrop_path": null,
      "genre_ids": [
        878
      ],
      "id": 832180,
      "title": "Posteridad",
      "original_language": "es",
      "original_title": "Posteridad",
      "overview": "",
      "popularity": 0.3043,
      "poster_path": "/zxax1XL3IwWwfQW150d2OxSiN0X.jpg",
      "release_date": "2021-04-28",
      "softcore": false,
      "video": false,
      "vote_average": 0,
      "vote_count": 0
    },
    {
      "adult": false,
      "backdrop_path": "/cBgrdobrGu59xmrzuiEw1An9C7p.jpg",
      "genre_ids": [
        12,
        27
      ],
      "id": 284270,
      "title": "Cub",
      "original_language": "nl",
      "original_title": "Welp",
      "overview": "Over-imaginative 12 year-old Sam heads off to the woods to summer scout camp with his pack convinced that he will encounter a monster...",
      "popularity": 1.6134,
      "poster_path": "/m3IJum2fBtkHG1zfF4aia2PhiLL.jpg",
      "release_date": "2014-10-29",
      "softcore": false,
      "video": false,
      "vote_average": 5.482,
      "vote_count": 254
    },
    {
      "adult": false,
      "backdrop_path": "/46xUoAdPtTe8Nly33FVXeD1YFLJ.jpg",
      "genre_ids": [
        28,
        35
      ],
      "id": 284275,
      "title": "Dick Smart 2.007",
      "original_language": "it",
      "original_title": "Dick Smart 2.007",
      "overview": "Lady Lorraine Lister, a financer of expensive experiments, has discovered a way to obtain pure diamonds by the means of a radiation device. She hires five renowned scientists to participate in additional experiments regarding this new contrivance. However, it soon happens that the device is stolen, and the scientists mysteriously disappear! Agent Dick Smart is called in by the CIA to track down the scientists and recover the device. With the help of incredible gadgets and lots of bravado, he manages to locate the source of an underground operation in Rio De Janeiro: an operation headed by a mysterious man with a speaking device fastened to his throat.",
      "popularity": 0.4376,
      "poster_path": "/m8h69lh3lrwmITsqqVGoEcAv6rL.jpg",
      "release_date": "1967-03-09",
      "softcore": false,
      "video": false,
      "vote_average": 7,
      "vote_count": 2
    },
    {
      "adult": false,
      "backdrop_path": "/kjP6ghSTQAJmN0zzva0PuwLiK88.jpg",
      "genre_ids": [
        28,
        18,
        80,
        53
      ],
      "id": 21776,
      "title": "Cash Truck",
      "original_language": "fr",
      "original_title": "Le Convoyeur",
      "overview": "Vigilante, a small armored truck company, is in full crisis mode. Victim of three violent hold-ups in a year, which left no survivors, the company is on the verge of bankruptcy and its employees are extremely worried. Some even suggest a complicity between the robbers and the firm.  It is in this difficult context that a man, Alexandre Demarre, one morning presents himself to start his first day of work at Vigilante.",
      "popularity": 2.6073,
      "poster_path": "/huGODrOTIElqmV3WuOHwo2IFZVv.jpg",
      "release_date": "2004-04-14",
      "softcore": false,
      "video": false,
      "vote_average": 6.361,
      "vote_count": 212
    },
    {
      "adult": false,
      "backdrop_path": "/j3c6qh98WZ2bQ9tibE573ifeB6u.jpg",
      "genre_ids": [
        35,
        28,
        12
      ],
      "id": 21779,
      "title": "The Silencers",
      "original_language": "en",
      "original_title": "The Silencers",
      "overview": "Matt Helm is called out of retirement to stop the evil Big O organization who plan to explode an atomic bomb over Alamagordo, NM, and start WW III.",
      "popularity": 1.6984,
      "poster_path": "/eLxVPMCV3IWiOKwxRKoSZqpT8lY.jpg",
      "release_date": "1966-02-18",
      "softcore": false,
      "video": false,
      "vote_average": 6,
      "vote_count": 53
    },
    {
      "adult": false,
      "backdrop_path": "/hpgy5VYpP2PUa9MaVmYcQXTDO6b.jpg",
      "genre_ids": [
        28,
        80,
        18,
        53
      ],
      "id": 287767,
      "title": "Mardaani",
      "original_language": "hi",
      "original_title": "मर्दानी",
      "overview": "A Mumbai police officer's search for a missing teenage girl leads her to the depraved world of child trafficking. What follows is a cat-and-mouse game between the officer and a ruthless mafia kingpin.",
      "popularity": 2.5789,
      "poster_path": "/fD1zfYXgMbDkgIt9ZrHfte6mWHE.jpg",
      "release_date": "2014-08-22",
      "softcore": false,
      "video": false,
      "vote_average": 6.671,
      "vote_count": 123
    },
    {
      "adult": false,
      "backdrop_path": "/gHMzchjtEjfaVmVkUQem4gXZJM9.jpg",
      "genre_ids": [
        10752,
        12,
        18
      ],
      "id": 25553,
      "title": "Dark of the Sun",
      "original_language": "en",
      "original_title": "Dark of the Sun",
      "overview": "A band of mercenaries led by Captain Curry travel through war-torn Congo across deadly terrain, battling rival armies, to steal $50 million in uncut diamonds. But infighting, sadistic rebels and a time lock jeopardize everything.",
      "popularity": 1.242,
      "poster_path": "/yaIJyzcsbaUed9qh82gO1sZo0ko.jpg",
      "release_date": "1968-02-08",
      "softcore": false,
      "video": false,
      "vote_average": 6.565,
      "vote_count": 84
    },
    {
      "adult": false,
      "backdrop_path": "/vdbLewJrL6zf1FBezpFHihS6r6G.jpg",
      "genre_ids": [
        18,
        28,
        35
      ],
      "id": 25676,
      "title": "Rob-B-Hood",
      "original_language": "cn",
      "original_title": "寶貝計劃",
      "overview": "For never-do-well compulsive gambler Fong, there's only one thing more fearsome than debtors at his doorstep - having to coax a crying baby. But what if the baby becomes his golden goose to fend off his debtors? Can he overcome his phobia of diapers, milk bottles, and cloying lullabies?",
      "popularity": 3.8901,
      "poster_path": "/aJZ8i1KEy5Kdc6hXNlLiHOlhdTA.jpg",
      "release_date": "2006-09-28",
      "softcore": false,
      "video": false,
      "vote_average": 6.97,
      "vote_count": 696
    },
    {
      "adult": false,
      "backdrop_path": "/oG6Kysr5AGAXF2VIV7uDqRgNV2c.jpg",
      "genre_ids": [
        28
      ],
      "id": 287743,
      "title": "G-men vs. the Black Dragon",
      "original_language": "en",
      "original_title": "G-men vs. the Black Dragon",
      "overview": "Japanese spies attempt to subvert America's war effort; G-Men attempt to thwart their plot.",
      "popularity": 0.7694,
      "poster_path": "/2g5KjZvngdlVEF6acib3hDD00ZF.jpg",
      "release_date": "1943-01-16",
      "softcore": false,
      "video": false,
      "vote_average": 6.667,
      "vote_count": 3
    },
    {
      "adult": false,
      "backdrop_path": "/yheWWmGBLEf7lTePzl6cmXDOjEK.jpg",
      "genre_ids": [
        53,
        28,
        80
      ],
      "id": 22090,
      "title": "Telefon",
      "original_language": "en",
      "original_title": "Telefon",
      "overview": "Nicolai Dalchimski, a mad KGB agent steals a notebook full of names of \"sleeping\" undercover KGB agents sent to the U.S. in the 1950's. These agents got their assignments under hypnosis, so they can't remember their missions until they're told a line of a Robert Frost poem. Dalchimski flees to the U.S. and starts phoning these agents who perform sabotage acts against military targets.",
      "popularity": 1.9536,
      "poster_path": "/dryfRzxf9lFuLI8UPJnjSoa3QxZ.jpg",
      "release_date": "1977-12-16",
      "softcore": false,
      "video": false,
      "vote_average": 6.639,
      "vote_count": 133
    },
    {
      "adult": false,
      "backdrop_path": "/jJKjniDrS1FaWiSgOBxjjTe6ME.jpg",
      "genre_ids": [
        37,
        12,
        28
      ],
      "id": 22383,
      "title": "The Professionals",
      "original_language": "en",
      "original_title": "The Professionals",
      "overview": "An arrogant Texas millionaire hires four adventurers to rescue his kidnapped wife from a notorious Mexican bandit.",
      "popularity": 4.0319,
      "poster_path": "/sH4Clw7QrtH23xl9o4sOpHNkRIz.jpg",
      "release_date": "1966-11-01",
      "softcore": false,
      "video": false,
      "vote_average": 7.094,
      "vote_count": 346
    },
    {
      "adult": false,
      "backdrop_path": "/fue9VR3v82qRo1Z4IOA5S3ffokE.jpg",
      "genre_ids": [
        18,
        28,
        80
      ],
      "id": 285221,
      "title": "The Janitor",
      "original_language": "tl",
      "original_title": "The Janitor",
      "overview": "Crisanto Espina, a cop on suspension and under investigation, is tasked to eliminate the suspects involved in a bank robbery/massacre that shocked the whole nation.",
      "popularity": 0.3195,
      "poster_path": "/u6Ri9UjorFpJhSJWEMpOE3uIB9Q.jpg",
      "release_date": "2014-08-01",
      "softcore": false,
      "video": false,
      "vote_average": 5.8,
      "vote_count": 4
    },
    {
      "adult": false,
      "backdrop_path": "/mmhw9ekCTtysCJwaUvHuA0z32FM.jpg",
      "genre_ids": [
        28,
        35
      ],
      "id": 22434,
      "title": "If Looks Could Kill",
      "original_language": "en",
      "original_title": "If Looks Could Kill",
      "overview": "Michael Corben, along with the rest of his high-school French class, sets out for a trip to France when he is mistaken for an agent of the same name. He is beseiged by both the good guys and the bad guys. British Intelligence outfits him with a series of James-Bond-like gizmos, and Steranko sends more would-be assassins after him. Can Michael stop the evil Steranko's plans for European domination?",
      "popularity": 1.9493,
      "poster_path": "/rTjcoGpHONeacV4zewHi1oSttW.jpg",
      "release_date": "1991-03-15",
      "softcore": false,
      "video": false,
      "vote_average": 6.154,
      "vote_count": 179
    },
    {
      "adult": false,
      "backdrop_path": "/9ed8wL5zUIYBxPhLLi5tH9QQDqL.jpg",
      "genre_ids": [
        12,
        14,
        10751
      ],
      "id": 1025121,
      "title": "Mateo's Night",
      "original_language": "es",
      "original_title": "La noche de Mateo",
      "overview": "The world of dreams keeps Mateo locked up, will he be able to wake up?",
      "popularity": 0.8399,
      "poster_path": "/iaGJC61d4HOtUdXTS9sO5L1X7Jw.jpg",
      "release_date": "2008-04-07",
      "softcore": false,
      "video": false,
      "vote_average": 0,
      "vote_count": 0
    },
    {
      "adult": false,
      "backdrop_path": "/wOjkbUL4tPioHwAIzDZaJsWkO8V.jpg",
      "genre_ids": [
        80,
        18,
        28
      ],
      "id": 832544,
      "title": "Stealing Raden Saleh",
      "original_language": "id",
      "original_title": "Mencuri Raden Saleh",
      "overview": "To get his father out of prison, a master forger assembles a diverse team of specialists to steal a priceless painting.",
      "popularity": 1.0601,
      "poster_path": "/66yOibmlqxASFoNyEZIORELJqBC.jpg",
      "release_date": "2022-08-25",
      "softcore": false,
      "video": false,
      "vote_average": 7.556,
      "vote_count": 36
    },
    {
      "adult": false,
      "backdrop_path": null,
      "genre_ids": [
        28,
        80,
        9648,
        53
      ],
      "id": 1210019,
      "title": "Cornered",
      "original_language": "en",
      "original_title": "Cornered",
      "overview": "A Los Angeles homicide detective must stop a government trained serial killer before the agency that trained him can cover it up.",
      "popularity": 0.3901,
      "poster_path": "/rCZv6uD5xfCG8udtx2rETzSI3fc.jpg",
      "release_date": "2011-12-30",
      "softcore": false,
      "video": false,
      "vote_average": 0,
      "vote_count": 0
    },
    {
      "adult": false,
      "backdrop_path": "/xx287dW4k7eirA06lJbv9veJpCS.jpg",
      "genre_ids": [
        16,
        28,
        12,
        10751,
        878
      ],
      "id": 639999,
      "title": "Ejen Ali: The Movie",
      "original_language": "ms",
      "original_title": "Ejen Ali: The Movie",
      "overview": "As MATA seeks to upgrade its gadget for all agents, Ali embarks on a mission to stop a plot against Cyberaya but begins to question his loyalty.",
      "popularity": 1.9747,
      "poster_path": "/cYdGwCMR1DD3Vg61zrR3NsyrJal.jpg",
      "release_date": "2019-11-28",
      "softcore": false,
      "video": false,
      "vote_average": 8.16,
      "vote_count": 25
    },
    {
      "adult": false,
      "backdrop_path": "/1qKTp9G1hrCxindF0xpsZGKbSsL.jpg",
      "genre_ids": [
        28,
        18,
        80
      ],
      "id": 25047,
      "title": "Le Deuxième Souffle",
      "original_language": "fr",
      "original_title": "Le Deuxième Souffle",
      "overview": "A gangster escapes jail and quickly makes plans to continue his criminal ways elsewhere, but a determined inspector is closing in.",
      "popularity": 1.5913,
      "poster_path": "/yuTl6T6BnRdCqyGMJvSmLkAgSaS.jpg",
      "release_date": "1966-11-01",
      "softcore": false,
      "video": false,
      "vote_average": 7.681,
      "vote_count": 207
    },
    {
      "adult": false,
      "backdrop_path": "/9t5IQQ4CcCXXgZIdEg1POTLHqMF.jpg",
      "genre_ids": [
        35,
        28
      ],
      "id": 639832,
      "title": "Undercover Brother 2",
      "original_language": "en",
      "original_title": "Undercover Brother 2",
      "overview": "Sixteen years ago, Undercover Brother and his younger brother were hot on the heels of the leader of a racist, worldwide syndicate, but accidentally got caught in an avalanche of white snow. After they were discovered and thawed out, Undercover Brother remained in a coma. Now, it is up to his little brother to finish the job they started.",
      "popularity": 1.3887,
      "poster_path": "/qHoCC9A8s00VqulXvSJOrnVXQgB.jpg",
      "release_date": "2019-11-05",
      "softcore": false,
      "video": false,
      "vote_average": 4.4,
      "vote_count": 35
    }
  ],
  "providers": {
    "streaming": [
      {
        "name": "MGM Plus Roku Premium Channel",
        "logo": "/lD7HKUmXDvUya58DceiTA809Zbf.jpg"
      }
    ],
    "buy": [
      {
        "name": "Amazon Video",
        "logo": "/qR6FKvnPBx2O37FDg8PNM7efwF3.jpg"
      },
      {
        "name": "Apple TV Store",
        "logo": "/SPnB1qiCkYfirS2it3hZORwGVn.jpg"
      },
      {
        "name": "Google Play Movies",
        "logo": "/8z7rC8uIDaTM91X0ZfkRf04ydj2.jpg"
      },
      {
        "name": "YouTube",
        "logo": "/pTnn5JwWr4p3pG8H6VrpiQo7Vs0.jpg"
      },
      {
        "name": "Fandango At Home",
        "logo": "/oIXE9vJdkilIxCLAtlbtiqewgvn.jpg"
      }
    ]
  },
  "runtime": 148,
  "genres": [
    "Action",
    "Science Fiction",
    "Adventure"
  ],
  "networks": [],
  "numberOfEpisodes": null,
  "numberOfSeasons": null,
  "seasons": [],
  "ageRating": "PG-13",
  "imdbId": "tt1375666"
}
```


---

### 9. AI Recommendation Engine

- **Endpoint**: `POST /api/recommend`
- **Target URL**: `https://sequel-backend.vercel.app/api/recommend`
- **HTTP Status**: `200` (✅ PASS)
- **Response Time**: `238ms`

**Request Payload**:
```json
{
  "title": "Inception",
  "type": "movie",
  "genres": "Sci-Fi"
}
```

**Response Body**:
```json
{
  "recommendations": [
    {
      "id": "rec-1",
      "title": "Interstellar",
      "type": "movie",
      "releaseDate": "2014-11-07",
      "synopsis": "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
      "genres": [
        "Sci-Fi",
        "Adventure",
        "Drama"
      ],
      "creators": [
        "Christopher Nolan"
      ],
      "platforms": [
        "Prime Video",
        "Apple TV"
      ],
      "coverUrl": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
      "backdropUrl": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80",
      "reason": "Since you love deep Sci-Fi and mind-bending storytelling like Inception."
    },
    {
      "id": "rec-2",
      "title": "The Witcher 3: Wild Hunt",
      "type": "game",
      "releaseDate": "2015-05-19",
      "synopsis": "Geralt of Rivia, a monster hunter, searches for his adopted daughter who is on the run from the Wild Hunt.",
      "genres": [
        "RPG",
        "Adventure",
        "Open World"
      ],
      "creators": [
        "CD Projekt Red"
      ],
      "platforms": [
        "PC",
        "PS5",
        "Xbox Series X/S",
        "Switch"
      ],
      "coverUrl": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80",
      "backdropUrl": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80",
      "reason": "Because you enjoy expansive fantasy roleplaying and rich character-driven narratives like Zelda."
    },
    {
      "id": "rec-3",
      "title": "The Martian",
      "type": "book",
      "releaseDate": "2011-09-27",
      "synopsis": "An astronaut becomes stranded on Mars after his team assume him dead, and must rely on his ingenuity to find a way to signal to Earth.",
      "genres": [
        "Sci-Fi",
        "Adventure"
      ],
      "creators": [
        "Andy Weir"
      ],
      "platforms": [
        "Kindle",
        "Paperback",
        "Audible"
      ],
      "coverUrl": "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=600&auto=format&fit=crop&q=80",
      "backdropUrl": "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=1200&auto=format&fit=crop&q=80",
      "reason": "By the author of Project Hail Mary, matching your love for hard-science space survival stories."
    }
  ]
}
```


---

### 10. 404 Error Handling Verification

- **Endpoint**: `GET /api/non-existent-endpoint`
- **Target URL**: `https://sequel-backend.vercel.app/api/non-existent-endpoint`
- **HTTP Status**: `404` (✅ PASS)
- **Response Time**: `252ms`

**Response Body**:
```json
{
  "error": "Endpoint not found"
}
```

