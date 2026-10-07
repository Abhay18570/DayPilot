import { Redirect } from 'expo-router';
// Normal tab presses open a modal; direct links to this action take the same path.
export default function AddAction() { return <Redirect href="/(app)/add-task" />; }
