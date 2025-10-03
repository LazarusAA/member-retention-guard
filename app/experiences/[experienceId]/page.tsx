import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";

export default async function ExperiencePage({
	params,
}: {
	params: Promise<{ experienceId: string }>;
}) {
	// The headers contains the user token
	const headersList = await headers();

	// The experienceId is a path param
	const { experienceId } = await params;

	// The user token is in the headers
	const { userId } = await whopSdk.verifyUserToken(headersList);

	const result = await whopSdk.access.checkIfUserHasAccessToExperience({
		userId,
		experienceId,
	});

	const user = await whopSdk.users.getUser({ userId });
	const experience = await whopSdk.experiences.getExperience({ experienceId });

	// Either: 'admin' | 'customer' | 'no_access';
	// 'admin' means the user is an admin of the whop, such as an owner or moderator
	// 'customer' means the user is a common member in this whop
	// 'no_access' means the user does not have access to the whop
	const { accessLevel } = result;

	// Check if user has access, if not show access denied message
	if (!result.hasAccess) {
		return (
			<div className="flex justify-center items-center h-screen px-8">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
					<p className="text-lg">
						Hi <strong>{user.name}</strong>, you do not have access to this experience.
					</p>
					<p className="text-sm text-gray-600 mt-2">
						Your access level: <strong>{accessLevel}</strong>
					</p>
				</div>
			</div>
		);
	}

	// Main app content - this is what users will see when they have access
	return (
		<div className="min-h-screen bg-gray-a12 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-3xl mx-auto">
				<div className="text-center mb-12">
					<h1 className="text-8 font-bold text-gray-9 mb-4">
						Welcome to Your Whop App
					</h1>
					<p className="text-4 text-gray-6">
						Hello <strong>{user.name}</strong>! You have access to this experience.
					</p>
				</div>

				<div className="space-y-8">
					<div className="bg-white p-6 rounded-lg shadow-md">
						<h2 className="text-5 font-semibold text-gray-9 mb-4 flex items-center">
							<span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-accent-9 text-white mr-3">
								1
							</span>
							Your App is Working!
						</h2>
						<p className="text-gray-6 ml-11">
							This is your main app content. You can build your actual application features here.
						</p>
					</div>

					<div className="bg-white p-6 rounded-lg shadow-md">
						<h2 className="text-5 font-semibold text-gray-9 mb-4 flex items-center">
							<span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-accent-9 text-white mr-3">
								2
							</span>
							User Information
						</h2>
						<div className="text-gray-6 ml-11">
							<p><strong>User:</strong> {user.name} (@{user.username})</p>
							<p><strong>Access Level:</strong> {accessLevel}</p>
							<p><strong>Experience:</strong> {experience.name}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
