import { RichText } from "./RichText.tsx";
import { data } from "./data.ts";

function App() {
  return (
    <div className="p-4">
    <h1 className="text-2xl font-bold mb-4">Umbraco Rich Text Example</h1>
      <RichText data={data} />
    </div>
  );
}

export default App;
