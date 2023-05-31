export type RedditType = {
  id: string;
  title: string;
  author: string;
  postType: string;
  body: string;
  dateCreated: Date;
  url: string;
};

export type DiscordType = {
  id: string;
  content: string;
  author: string;
  postType: string;
  dateCreated: Date;
  serverName: string;
  channelName: string;
};
