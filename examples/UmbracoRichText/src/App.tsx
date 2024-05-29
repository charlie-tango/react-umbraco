import data from './data';
import RichText from './RichText';

function App() {
  return (
    <div className="p-4">
      <RichText data={data} />
    </div>
  );
}

export default App;
