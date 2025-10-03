export interface Member {
	id: string;
	experience_id: string;
	user_id: string;
	metrics: {
		logins: number;
		interactions: number;
	};
	created_at: string;
}

