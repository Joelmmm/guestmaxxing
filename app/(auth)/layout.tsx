export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/20">
            <h1 className="mb-8 text-3xl font-bold text-center">Guestmaxxing</h1>
            {children}
        </div>
    );
}
