jest.mock('./dgraphClient', () => ({
  executeGraphQL: jest.fn().mockResolvedValue({
    addNode: {
      node: [
        {
          id: 'it-test-id',
          label: 'IT Node',
          type: 'concept',
          level: 1,
          status: 'pending',
          branch: 'main'
        }
      ]
    }
  })
}));
const request = require('supertest');
const app = require('./server'); // Import the Express app

describe.only('Integration /api/mutate', () => {
  it('should create a node and return JSON payload from Dgraph', async () => {
    const payload = {
      mutation: `
        mutation AddNode($input: [AddNodeInput!]!) {
          addNode(input: $input) {
            node { id label type level status branch }
          }
        }
      `,
      variables: {
        input: [
          {
            id: "it-test-id",
            label: "IT Node",
            type: "concept",
            level: 1,
            status: "pending",
            branch: "main"
          }
        ]
      }
    };

    const res = await request(app)
      .post('/api/mutate')
      .send(payload)
      .expect('Content-Type', /json/)
      .expect(200);

    // Verify the response body contains the addNode.node array
    expect(res.body).toHaveProperty('addNode.node');
    expect(Array.isArray(res.body.addNode.node)).toBe(true);
    expect(res.body.addNode.node[0]).toMatchObject({
      id: "it-test-id",
      label: "IT Node",
      type: "concept"
    });
  });
});
