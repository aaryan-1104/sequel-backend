# API Test Results Log

**Last Updated**: `2026-08-01T12:45:45.143Z`  
**Target URL**: `https://sequel-backend.vercel.app`  

---

## Summary Table

| # | Test Name | Method | Endpoint | Status | Result |
|---|---|---|---|---|---|
| 1 | Root Health Landing | `GET` | `/` | `200` | ✅ PASS (842ms) |
| 2 | System Status | `GET` | `/api/status` | `200` | ✅ PASS (876ms) |
| 3 | Gemini & System Health Check | `GET` | `/api/health` | `200` | ✅ PASS (245ms) |
| 4 | Firebase Admin Setup Check | `GET` | `/api/firebase-check` | `200` | ✅ PASS (270ms) |
| 5 | Unified Media Search (Movie: Inception) | `POST` | `/api/search` | `200` | ✅ PASS (435ms) |
| 6 | Unified Media Search (TV: Stranger Things) | `POST` | `/api/search` | `200` | ✅ PASS (1754ms) |
| 7 | TMDB Media Details (ID: 27205 - Inception) | `POST` | `/api/tmdb-details` | `200` | ✅ PASS (1223ms) |
| 8 | AI Recommendation Engine | `POST` | `/api/recommend` | `200` | ✅ PASS (476ms) |
| 9 | 404 Error Handling Verification | `GET` | `/api/non-existent-endpoint` | `404` | ✅ PASS (320ms) |

---

## Detailed Call Logs

### 1. Root Health Landing

- **Endpoint**: `GET /`
- **Target URL**: `https://sequel-backend.vercel.app/`
- **HTTP Status**: `200` (✅ PASS)
- **Response Time**: `842ms`

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
- **Response Time**: `876ms`

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
- **Response Time**: `245ms`

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
- **HTTP Status**: `200` (✅ PASS)
- **Response Time**: `270ms`

**Response Body**:
```json
{
  "status": "ok",
  "message": "Firebase Admin is configured correctly!"
}
```


---

### 5. Unified Media Search (Movie: Inception)

- **Endpoint**: `POST /api/search`
- **Target URL**: `https://sequel-backend.vercel.app/api/search`
- **HTTP Status**: `200` (✅ PASS)
- **Response Time**: `435ms`

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

### 6. Unified Media Search (TV: Stranger Things)

- **Endpoint**: `POST /api/search`
- **Target URL**: `https://sequel-backend.vercel.app/api/search`
- **HTTP Status**: `200` (✅ PASS)
- **Response Time**: `1754ms`

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

### 7. TMDB Media Details (ID: 27205 - Inception)

- **Endpoint**: `POST /api/tmdb-details`
- **Target URL**: `https://sequel-backend.vercel.app/api/tmdb-details`
- **HTTP Status**: `200` (✅ PASS)
- **Response Time**: `1223ms`

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
      "popularity": 3.7299,
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
      "popularity": 0.7519,
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
      "popularity": 8.2463,
      "release_date": "2017-08-03",
      "softcore": false,
      "video": false,
      "vote_average": 5.802,
      "vote_count": 5588
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
      "popularity": 9.4661,
      "release_date": "2018-05-15",
      "softcore": false,
      "video": false,
      "vote_average": 6.557,
      "vote_count": 9369
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
      "popularity": 4.9841,
      "release_date": "2009-02-04",
      "softcore": false,
      "video": false,
      "vote_average": 6.145,
      "vote_count": 2471
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
      "popularity": 5.0793,
      "release_date": "2003-12-25",
      "softcore": false,
      "video": false,
      "vote_average": 6.224,
      "vote_count": 2065
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
      "popularity": 9.1033,
      "release_date": "2017-03-29",
      "softcore": false,
      "video": false,
      "vote_average": 6.1,
      "vote_count": 8643
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
      "popularity": 7.265,
      "release_date": "2019-10-02",
      "softcore": false,
      "video": false,
      "vote_average": 6.262,
      "vote_count": 5509
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
      "popularity": 14.2149,
      "release_date": "2023-09-27",
      "softcore": false,
      "video": false,
      "vote_average": 7.029,
      "vote_count": 4046
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
      "popularity": 12.4801,
      "release_date": "2025-02-24",
      "softcore": false,
      "video": false,
      "vote_average": 6.481,
      "vote_count": 1728
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
      "popularity": 5.0158,
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
      "popularity": 8.0909,
      "release_date": "2015-08-13",
      "softcore": false,
      "video": false,
      "vote_average": 7.079,
      "vote_count": 6937
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
      "popularity": 6.7343,
      "release_date": "2016-03-09",
      "softcore": false,
      "video": false,
      "vote_average": 6.101,
      "vote_count": 7039
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
      "popularity": 7.4354,
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
      "popularity": 6.6422,
      "release_date": "2021-02-24",
      "softcore": false,
      "video": false,
      "vote_average": 6.547,
      "vote_count": 2637
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
      "popularity": 45.5122,
      "release_date": "1999-03-31",
      "softcore": false,
      "video": false,
      "vote_average": 8.3,
      "vote_count": 28294
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
      "popularity": 9.1747,
      "release_date": "2013-04-10",
      "softcore": false,
      "video": false,
      "vote_average": 6.687,
      "vote_count": 11647
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
      "popularity": 17.3404,
      "release_date": "2010-12-14",
      "softcore": false,
      "video": false,
      "vote_average": 6.546,
      "vote_count": 8032
    },
    {
      "adult": false,
      "backdrop_path": "/ohijjhvNqAPKTURQr6VIF7xuAjY.jpg",
      "id": 338970,
      "title": "Tomb Raider",
      "original_title": "Tomb Raider",
      "overview": "Lara Croft, the fiercely independent daughter of a missing adventurer, must push herself beyond her limits when she finds herself on the island where her father disappeared.",
      "poster_path": "/s4Qn5LF6OwK4rIifmthIDtbqDSs.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        28,
        12,
        14
      ],
      "popularity": 9.0936,
      "release_date": "2018-03-05",
      "softcore": false,
      "video": false,
      "vote_average": 6.365,
      "vote_count": 8425
    },
    {
      "adult": false,
      "backdrop_path": "/8YNNyQiPZlF9qv5EGOUK20mnXVk.jpg",
      "id": 262500,
      "title": "Insurgent",
      "original_title": "Insurgent",
      "overview": "Beatrice Prior must confront her inner demons and continue her fight against a powerful alliance which threatens to tear her society apart.",
      "poster_path": "/dP5Fb6YRfzmCQtRbHOr2kO7tJW9.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        28,
        878,
        53
      ],
      "popularity": 7.9686,
      "release_date": "2015-03-18",
      "softcore": false,
      "video": false,
      "vote_average": 6.359,
      "vote_count": 10510
    },
    {
      "adult": false,
      "backdrop_path": "/hqrwXs3KqPuU5rWoconbmQUn6rh.jpg",
      "id": 299687,
      "title": "The 5th Wave",
      "original_title": "The 5th Wave",
      "overview": "16-year-old Cassie Sullivan tries to survive in a world devastated by the waves of an alien invasion that has already decimated the population and knocked mankind back to the Stone Age.",
      "poster_path": "/ja34BV577dtjWl2S5G1tB93IjYb.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        878,
        12,
        28
      ],
      "popularity": 6.9603,
      "release_date": "2016-01-14",
      "softcore": false,
      "video": false,
      "vote_average": 5.938,
      "vote_count": 6084
    },
    {
      "adult": false,
      "backdrop_path": "/jXDselREPq8TOVGM4dzBBUM7xVk.jpg",
      "id": 399579,
      "title": "Alita: Battle Angel",
      "original_title": "Alita: Battle Angel",
      "overview": "When Alita awakens with no memory of who she is in a future world she does not recognize, she is taken in by Ido, a compassionate doctor who realizes that somewhere in this abandoned cyborg shell is the heart and soul of a young woman with an extraordinary past.",
      "poster_path": "/xRWht48C2V8XNfzvPehyClOvDni.jpg",
      "media_type": "movie",
      "original_language": "en",
      "genre_ids": [
        28,
        878,
        12
      ],
      "popularity": 13.534,
      "release_date": "2019-01-31",
      "softcore": false,
      "video": false,
      "vote_average": 7.268,
      "vote_count": 10201
    },
    {
      "adult": false,
      "backdrop_path": "/aK1uB5c111DXSvPOrriizPoWwh9.jpg",
      "genre_ids": [
        28,
        53,
        80
      ],
      "id": 2026,
      "title": "Hostage",
      "original_language": "en",
      "original_title": "Hostage",
      "overview": "When a mafia accountant is taken hostage on his beat, a police officer – wracked by guilt from a prior stint as a negotiator – must negotiate the standoff, even as his own family is held captive by the mob.",
      "popularity": 3.9934,
      "poster_path": "/vjhLmtjO2pMQXRgkxcwZoq2Ma8n.jpg",
      "release_date": "2005-03-09",
      "softcore": false,
      "video": false,
      "vote_average": 6.357,
      "vote_count": 1790
    },
    {
      "adult": false,
      "backdrop_path": "/qurwfjYAzSgSsQl99IY6ttZ0S7P.jpg",
      "genre_ids": [
        878,
        12,
        9648
      ],
      "id": 2067,
      "title": "Mission to Mars",
      "original_language": "en",
      "original_title": "Mission to Mars",
      "overview": "When the first manned mission to Mars meets with a catastrophic and mysterious disaster after reporting an unidentified structure, a rescue mission is launched to investigate the tragedy and bring back any survivors.",
      "popularity": 3.5588,
      "poster_path": "/cTKWoBpN5Gvi0vpMb9mLtYlwXqT.jpg",
      "release_date": "2000-03-10",
      "softcore": false,
      "video": false,
      "vote_average": 6.04,
      "vote_count": 1619
    },
    {
      "adult": false,
      "backdrop_path": "/e86x1nXqfXRlqATuy60MmzFUFQr.jpg",
      "genre_ids": [
        80,
        9648,
        53,
        18,
        28
      ],
      "id": 2163,
      "title": "Breakdown",
      "original_language": "en",
      "original_title": "Breakdown",
      "overview": "On their cross-country drive, a married couple, Jeff and Amy Taylor, experience car trouble after their SUV breaks down. Stranded in the New Mexico desert, the two catch a break when a passing truck driver offers Amy a ride to a nearby café to call for help. Meanwhile, Jeff is able to fix the car and make his way to the café, but Amy isn't there. He tracks down the trucker ― who tells the police he's never seen Jeff or his wife before. Jeff then begins a desperate, frenzied search for Amy.",
      "popularity": 4.9302,
      "poster_path": "/m3VB59ppr1RlpxNUYRUfZTgjgU.jpg",
      "release_date": "1997-05-02",
      "softcore": false,
      "video": false,
      "vote_average": 6.939,
      "vote_count": 1125
    },
    {
      "adult": false,
      "backdrop_path": "/3TeGmKJfkik1D1rIoqGb1aR4k9c.jpg",
      "genre_ids": [
        12,
        28,
        878
      ],
      "id": 1893,
      "title": "Star Wars: Episode I - The Phantom Menace",
      "original_language": "en",
      "original_title": "Star Wars: Episode I - The Phantom Menace",
      "overview": "Anakin Skywalker, a young slave strong with the Force, is discovered on Tatooine. Meanwhile, the evil Sith have returned, enacting their plot for revenge against the Jedi.",
      "popularity": 15.9933,
      "poster_path": "/6wkfovpn7Eq8dYNKaG5PY3q2oq6.jpg",
      "release_date": "1999-05-19",
      "softcore": false,
      "video": false,
      "vote_average": 6.582,
      "vote_count": 16012
    },
    {
      "adult": false,
      "backdrop_path": "/3zTbERSBLh7waK9811RTKGAcG86.jpg",
      "genre_ids": [
        16,
        10751,
        12,
        14
      ],
      "id": 441130,
      "title": "Wolfwalkers",
      "original_language": "en",
      "original_title": "Wolfwalkers",
      "overview": "In a time of superstition and magic, when wolves are seen as demonic and nature an evil to be tamed, a young apprentice hunter comes to Ireland with her father to wipe out the last pack. But when she saves a wild native girl, their friendship leads her to discover the world of the Wolfwalkers and transform her into the very thing her father is tasked to destroy.",
      "popularity": 6.1356,
      "poster_path": "/vqGiNbdc2sDwsnivMMYzwAoSSu6.jpg",
      "release_date": "2020-10-26",
      "softcore": false,
      "video": false,
      "vote_average": 8.173,
      "vote_count": 1418
    },
    {
      "adult": false,
      "backdrop_path": null,
      "genre_ids": [
        28,
        9648
      ],
      "id": 1000840,
      "title": "天字号密令",
      "original_language": "zh",
      "original_title": "天字号密令",
      "overview": "",
      "popularity": 3.5862,
      "poster_path": "/gTy9viQr6DedG6hAFvIn3aPjNzs.jpg",
      "release_date": "1990-01-01",
      "softcore": false,
      "video": false,
      "vote_average": 0,
      "vote_count": 0
    },
    {
      "adult": false,
      "backdrop_path": null,
      "genre_ids": [
        12,
        10751,
        10770
      ],
      "id": 620900,
      "title": "Spies",
      "original_language": "en",
      "original_title": "Spies",
      "overview": "Long Island, 1942. 12-year-old Harry detects spies everywhere. But suddenly things get serious, as he and two evacuated London kids, Ned and Flo, stumble onto a real adventure. The children end up with America's destiny in their hands.",
      "popularity": 0.9929,
      "poster_path": "/ckAeeOPUGIootPlpICY2PT4VxGe.jpg",
      "release_date": "1993-03-07",
      "softcore": false,
      "video": false,
      "vote_average": 10,
      "vote_count": 1
    },
    {
      "adult": false,
      "backdrop_path": null,
      "genre_ids": [
        28,
        80,
        35
      ],
      "id": 261473,
      "title": "Million Dollars Snatch",
      "original_language": "cn",
      "original_title": "七百萬元大劫案",
      "overview": "A career criminal, Ah Sang,  engineers a bank robbery to be carried out by a gang of recruited hoodlums led by himself. It takes only three minutes to complete the robbery of seven million dollars. A special police unit is then formed to investigate the case, and the chief inspector suspects Sang, and begins keeping him under surveillance. In order to stay undetected, each member is specifically ordered to not spend their share of the one million HKD from the heist for six months.",
      "popularity": 0.4576,
      "poster_path": "/odSTrqaffVUhkozeoQW0ck8hUmJ.jpg",
      "release_date": "1976-08-13",
      "softcore": false,
      "video": false,
      "vote_average": 7,
      "vote_count": 1
    },
    {
      "adult": false,
      "backdrop_path": "/gZqkMnORel0oiE0oSrBPfVQPB9w.jpg",
      "genre_ids": [
        28,
        12,
        10752
      ],
      "id": 1654,
      "title": "The Dirty Dozen",
      "original_language": "en",
      "original_title": "The Dirty Dozen",
      "overview": "12 American military prisoners in World War II are ordered to infiltrate a well-guarded enemy château and kill the Nazi officers vacationing there. The soldiers, most of whom are facing death sentences for a variety of violent crimes, agree to the mission and the possible commuting of their sentences.",
      "popularity": 7.9513,
      "poster_path": "/tFWWsuhp22zJ6OG6QepJIiPUfeF.jpg",
      "release_date": "1967-06-15",
      "softcore": false,
      "video": false,
      "vote_average": 7.596,
      "vote_count": 1344
    },
    {
      "adult": false,
      "backdrop_path": "/2b3PSB97qrxQduzquYihf7u3uwV.jpg",
      "genre_ids": [
        28,
        12,
        37
      ],
      "id": 1656,
      "title": "The Legend of Zorro",
      "original_language": "en",
      "original_title": "The Legend of Zorro",
      "overview": "Despite trying to keep his swashbuckling to a minimum, a threat to California's pending statehood causes the adventure-loving Don Alejandro de la Vega and his wife, Elena, to take action.",
      "popularity": 8.0498,
      "poster_path": "/93iEBX1QbsxAv8eSybe8lhLXY1A.jpg",
      "release_date": "2005-10-24",
      "softcore": false,
      "video": false,
      "vote_average": 6.125,
      "vote_count": 3129
    },
    {
      "adult": false,
      "backdrop_path": "/nchAb2I3vuP3nVE6BYYkaK55pQv.jpg",
      "genre_ids": [
        28,
        12,
        35
      ],
      "id": 1732,
      "title": "The Prisoner of Zenda",
      "original_language": "en",
      "original_title": "The Prisoner of Zenda",
      "overview": "Anthony Hope's classic tale gets a decidedly 'un-classic' treatment at the hands of Peter Sellers. Following the story somewhat, friends of the new King Rudolph of Ruritania fear for his life, and switch him with a look-a-like London cabby. Throw in two(!) lovely blondes, treachery, and a battle for life and honour, and enjoy life at its zaniest.",
      "popularity": 1.2748,
      "poster_path": "/mpyXdWpmPFSPiPxbbH0B7qDBl37.jpg",
      "release_date": "1979-08-17",
      "softcore": false,
      "video": false,
      "vote_average": 5.7,
      "vote_count": 39
    },
    {
      "adult": false,
      "backdrop_path": "/bwDTWOd0SCFWfRw8ophhykOgUBS.jpg",
      "genre_ids": [
        28,
        53
      ],
      "id": 1647,
      "title": "The Recruit",
      "original_language": "en",
      "original_title": "The Recruit",
      "overview": "A brilliant CIA trainee must prove his worth at the Farm, the agency's secret training grounds, where he learns to watch his back and trust no one.",
      "popularity": 3.8472,
      "poster_path": "/xInKytrHV3EJeCAulOpn5Q0bMxh.jpg",
      "release_date": "2003-01-31",
      "softcore": false,
      "video": false,
      "vote_average": 6.395,
      "vote_count": 1951
    },
    {
      "adult": false,
      "backdrop_path": "/kWYHKVCl2aD3kRco4eRUr4h6LsD.jpg",
      "genre_ids": [
        18,
        36,
        10752,
        28
      ],
      "id": 2024,
      "title": "The Patriot",
      "original_language": "en",
      "original_title": "The Patriot",
      "overview": "After proving himself on the field of battle in the French and Indian War, Benjamin Martin wants nothing more to do with such things, preferring the simple life of a farmer. But when his son Gabriel enlists in the army to defend their new nation, America, against the British, Benjamin reluctantly returns to his old life to protect his son.",
      "popularity": 11.7515,
      "poster_path": "/fWZd815QxUCUcrWQZwUkAp9ljG.jpg",
      "release_date": "2000-06-28",
      "softcore": false,
      "video": false,
      "vote_average": 7.211,
      "vote_count": 4403
    },
    {
      "adult": false,
      "backdrop_path": "/n5pEhP9GUZywJ0Q1c8QVR6ryb7H.jpg",
      "genre_ids": [
        53,
        28,
        80
      ],
      "id": 2155,
      "title": "Reindeer Games",
      "original_language": "en",
      "original_title": "Reindeer Games",
      "overview": "After assuming his dead cellmate's identity to get with his girlfriend, an ex-con finds himself the reluctant participant in a casino heist.",
      "popularity": 2.491,
      "poster_path": "/8y1PedfYWllJVoBbkt9KWLY155v.jpg",
      "release_date": "2000-02-25",
      "softcore": false,
      "video": false,
      "vote_average": 5.709,
      "vote_count": 741
    },
    {
      "adult": false,
      "backdrop_path": "/npnbvNO28udi5EfL0ompXf2KL8Z.jpg",
      "genre_ids": [
        28,
        878,
        53,
        80,
        10770
      ],
      "id": 2125,
      "title": "Wedlock",
      "original_language": "en",
      "original_title": "Wedlock",
      "overview": "A male prison escapee heads for his hidden loot, electronically attached to a female prisoner.",
      "popularity": 1.4605,
      "poster_path": "/jQNEJIKeCk9wNXRW7a2FiNCR3ie.jpg",
      "release_date": "1991-05-10",
      "softcore": false,
      "video": false,
      "vote_average": 5.792,
      "vote_count": 197
    },
    {
      "adult": false,
      "backdrop_path": "/6qQZ54iVgQWOFaVWss77yHy8YHu.jpg",
      "genre_ids": [
        35,
        878,
        10749
      ],
      "id": 2210,
      "title": "Earth Girls Are Easy",
      "original_language": "en",
      "original_title": "Earth Girls Are Easy",
      "overview": "In this musical comedy, Valerie is dealing with her philandering fiancé, Ted, when she finds that a trio of aliens have crashed their spaceship into her swimming pool. Once the furry beings are shaved at her girlfriend's salon, the women discover three handsome men underneath. After absorbing the native culture via television, the spacemen are ready to hit the dating scene in 1980s Los Angeles.",
      "popularity": 3.4785,
      "poster_path": "/lwFR24fEGf8Q6mGMsGcQuQTLL9T.jpg",
      "release_date": "1988-09-08",
      "softcore": false,
      "video": false,
      "vote_average": 5.6,
      "vote_count": 418
    },
    {
      "adult": false,
      "backdrop_path": "/cyecB7godJ6kNHGONFjUyVN9OX5.jpg",
      "genre_ids": [
        28,
        878,
        12
      ],
      "id": 1726,
      "title": "Iron Man",
      "original_language": "en",
      "original_title": "Iron Man",
      "overview": "After being held captive in an Afghan cave, billionaire engineer Tony Stark creates a unique weaponized suit of armor to fight evil.",
      "popularity": 39.3904,
      "poster_path": "/78lPtwv72eTNqFW9COBYI0dWDJa.jpg",
      "release_date": "2008-04-30",
      "softcore": false,
      "video": false,
      "vote_average": 7.663,
      "vote_count": 28409
    },
    {
      "adult": false,
      "backdrop_path": "/yFuKvT4Vm3sKHdFY4eG6I4ldAnn.jpg",
      "genre_ids": [
        28,
        12,
        878
      ],
      "id": 1771,
      "title": "Captain America: The First Avenger",
      "original_language": "en",
      "original_title": "Captain America: The First Avenger",
      "overview": "During World War II, Steve Rogers is a sickly man from Brooklyn who's transformed into super-soldier Captain America to aid in the war effort. Rogers must stop the Red Skull – Adolf Hitler's ruthless head of weaponry, and the leader of an organization that intends to use a mysterious device of untold powers for world domination.",
      "popularity": 16.1238,
      "poster_path": "/vSNxAJTlD0r02V9sPYpOjqDZXUK.jpg",
      "release_date": "2011-07-22",
      "softcore": false,
      "video": false,
      "vote_average": 7.01,
      "vote_count": 22932
    },
    {
      "adult": false,
      "backdrop_path": "/wwLufumafJojc59hgIamHyJSTO9.jpg",
      "genre_ids": [
        9648,
        10749,
        878
      ],
      "id": 1903,
      "title": "Vanilla Sky",
      "original_language": "en",
      "original_title": "Vanilla Sky",
      "overview": "David Aames has it all: wealth, good looks and gorgeous women on his arm. But just as he begins falling for the warmhearted Sofia, his face is horribly disfigured in a car accident. That's just the beginning of his troubles as the lines between illusion and reality, between life and death, are blurred.",
      "popularity": 8.615,
      "poster_path": "/cAh2pCiNPftsY3aSqJuIOde7uWr.jpg",
      "release_date": "2001-12-14",
      "softcore": false,
      "video": false,
      "vote_average": 6.828,
      "vote_count": 4736
    },
    {
      "adult": false,
      "backdrop_path": "/sjZIN2oDzOLGYuz21QwWw1tJ8ly.jpg",
      "genre_ids": [
        12,
        36,
        28
      ],
      "id": 1911,
      "title": "The 13th Warrior",
      "original_language": "en",
      "original_title": "The 13th Warrior",
      "overview": "A Muslim ambassador exiled from his homeland joins a group of Vikings, initially offended by their behavior but growing to respect them. As they travel together, they learn of a legendary evil closing in and must unite to confront this formidable force.",
      "popularity": 7.7408,
      "poster_path": "/pj1IQQ7ajwaOrjjTCxyM1L4mSnX.jpg",
      "release_date": "1999-08-13",
      "softcore": false,
      "video": false,
      "vote_average": 6.7,
      "vote_count": 2081
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

### 8. AI Recommendation Engine

- **Endpoint**: `POST /api/recommend`
- **Target URL**: `https://sequel-backend.vercel.app/api/recommend`
- **HTTP Status**: `200` (✅ PASS)
- **Response Time**: `476ms`

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

### 9. 404 Error Handling Verification

- **Endpoint**: `GET /api/non-existent-endpoint`
- **Target URL**: `https://sequel-backend.vercel.app/api/non-existent-endpoint`
- **HTTP Status**: `404` (✅ PASS)
- **Response Time**: `320ms`

**Response Body**:
```json
{
  "error": "Endpoint not found"
}
```

