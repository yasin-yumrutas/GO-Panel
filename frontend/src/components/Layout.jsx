import Topbar from './Topbar'
import InstallPWA from './InstallPWA'

export default function Layout({ children }) {
    return (
        <div className="flex h-screen w-full flex-col dynamic-bg text-foreground font-sans antialiased overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 backdrop-blur-sm bg-background/50">
                {children}
            </main>
            <InstallPWA />
        </div>
    )
}
