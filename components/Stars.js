import Icon from '@/components/Icon';

/** Five stars, filled to `value`. Rating is out of 5 throughout the app. */
export default function Stars({ value, size = 16 }) {
  return (
    <span className="stars" role="img" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="stars__star" data-filled={n <= value}>
          <Icon name="star" size={size} />
        </span>
      ))}
    </span>
  );
}
