import { NotFoundShell } from './error-shared';

export default function NotFound() {
  return (
    <NotFoundShell
      heading="Page not found"
      detail="This page does not exist or was moved. Check the address, or head back home."
      homeHref="/"
    />
  );
}
