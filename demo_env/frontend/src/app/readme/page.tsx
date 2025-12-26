
import { ReadmeViewer } from '@/components/readme-viewer';

export default function ReadmePage() {
    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-8">Project Documentation</h1>
            <div className="bg-white dark:bg-card rounded-lg shadow-sm border p-8">
                <ReadmeViewer />
            </div>
        </div>
    );
}
