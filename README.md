Messager
--------
Helper library for web messaging i.e. window.postMessage()

Overview
--------
* A JSON-like message syntax enables declarative validation. 
* Request-response roundtrips with Promises

/**
 * TODO
 * 
 * Object.assign({}, defaultOptions, options); 
 * 
 * destroy
 * 
 * unit test
 *    receiveMessage with payload errors sends error message        
 *  interacive test
 *    example library
 * 
 *  documentation
 *  type definitions 
 *  npm package
 */

/**
 * Configuration options for a Messager instance.
 *
 * window:
 * The reference to the target window.
 * The iframe host reference is iframe.contentWindow
 * For the iframe itself the referece is window.parent
 *
 * targetOrigin:
 * The URI of the target origin.
 *
 * source:
 * The source of the messages.
 */

 /**
 * The type of message.  
 */

 /**
 * Helper library for web messaging i.e. window.postMessage() 
 *  
 * Required message properties
 * ---------------------------  
 * All messages sent and received with Messager must contain these required properties:
 *  verb
 *  id 
 *  date
 *  type 
 *  source
 * 
 * Predefined message syntax
 * -------------------------
 * The structure of messages can be defined with a very lightweight, JSON-like syntax, 
 * which specifies which properties a message must contain.
 * 
 * A message structure can be defined per verb, or verb and type (TODO), is used to 
 * validate a received message.      
 * 
 *  Property exists check     
 *  ---------------------
 *  
 *  Propery type check
 *  -----------------
 *    array
 *    object
 *    boolean
 *    number  
 *    string 
 * 
 * Request-response roundtrips with Promises: 
 * ------------------------------------------
 *  
 */
    /**      
     * @param options. The configuration options for the Messager instance.
     */

 /**
         * Receive a message.
         * 
         * @param message. The received message. 
         */

           /**
     * Creates and posts a request message with the specified verb and payload.
     * Returns a Promise which is resolved when the response message 
     * is received.
     * 
     * @example Send a fire-and-forgot message.
     * I.e Do not wait for a response message.
     * 
     * @example Send a request message and perform an action when the response
     * message is received.  
     *   
     * @param verb. The message verb. TODO validate.  
     * @param payload. The message payload. TODO validate.
     * @returns A Promise that is resolved when the response message is
     * received.  
     */
     