import { useState } from 'react';
import './Rating.css';

interface RatingProps {
  value: number;
  count?: number;
  userRating?: number | null;
  onRate?: (rating: number) => void;
  readonly?: boolean;
}

export function Rating({ value, count, userRating, onRate, readonly = false }: RatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue ?? userRating ?? value;

  const handleClick = (rating: number) => {
    if (!readonly && onRate) {
      onRate(rating);
    }
  };

  return (
    <div className="rating-container">
      <div className={`stars ${readonly ? 'readonly' : 'interactive'}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= displayValue ? 'filled' : ''}`}
            onClick={() => handleClick(star)}
            onMouseEnter={() => !readonly && setHoverValue(star)}
            onMouseLeave={() => !readonly && setHoverValue(null)}
          >
            {star <= displayValue ? '\u2605' : '\u2606'}
          </span>
        ))}
      </div>
      <span className="rating-info">
        {value.toFixed(1)} {count !== undefined && `(${count} ratings)`}
      </span>
      {userRating && <span className="your-rating">Your rating: {userRating}</span>}
    </div>
  );
}
