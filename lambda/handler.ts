export const handler = async (event: any = {}): Promise<any> => {
  console.log("event:", event);
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello from Lambda!" }),
  };
};
