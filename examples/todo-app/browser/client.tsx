import { startBubbleReactApp } from '../../../bubble-browser'
import { TodoApp } from '../react/TodoApp.tsx'

await startBubbleReactApp({
  node: <TodoApp />,
})
