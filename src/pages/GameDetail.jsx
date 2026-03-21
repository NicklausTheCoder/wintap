import React from 'react';
import { useParams } from 'react-router-dom';
import SEO from '../components/SEO';

const GameDetail = ({ user }) => {
  const { gameId } = useParams();
  
  // Fetch game details from your data
  const gameDetails = {
    'flappy-bird': {
      title: 'Flappy Bird',
      description: 'Navigate through pipes in this classic arcade game. Compete with players worldwide and win real cash prizes!',
      image: '/images/games/flappy-bird-og.jpg',
      prize: '$50',
      players: '2,345'
    },
    'space-shooter': {
      title: 'Space Shooter',
      description: '1v1 space battles. Shoot down opponents and win big in this exciting space combat game!',
      image: '/images/games/space-shooter-og.jpg',
      prize: '$100',
      players: '1,892'
    }
  };

  const game = gameDetails[gameId] || gameDetails['flappy-bird'];

  return (
    <>
      <SEO 
        title={`${game.title} - Play & Win Real Cash`}
        description={game.description}
        keywords={`${game.title}, play ${game.title} online, win money ${game.title}, ${game.title} game`}
        url={`/games/${gameId}`}
        image={game.image}
        type="article"
        tags={[game.title, 'online games', 'win money']}
      />
      
      <div className="game-detail">
        {/* Your game detail content */}
        <h1>{game.title}</h1>
        <p>{game.description}</p>
        {/* ... rest of game detail UI */}
      </div>
    </>
  );
};

export default GameDetail;